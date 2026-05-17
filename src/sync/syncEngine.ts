import { logger } from '@/lib/logger';
import { googleDriveService } from '@/lib/googleDrive';
import { cacheStore } from './cacheStore';
import { syncQueue } from './syncQueue';
import { changeTracker } from './changeTracker';
import { conflictResolver } from './conflictResolver';
import type { Task } from '@/types';

type SyncListener = (status: SyncStatus) => void;

export interface SyncStatus {
    state: 'idle' | 'syncing' | 'error' | 'offline';
    lastSyncAt: string | null;
    pendingMutations: number;
    conflicts: number;
    error?: string;
}

interface SyncTelemetry {
    totalSyncs: number;
    totalConflicts: number;
    totalBytesRead: number;
    syncDurations: number[];
}

class SyncEngine {
    private status: SyncStatus = { state: 'idle', lastSyncAt: null, pendingMutations: 0, conflicts: 0 };
    private listeners = new Set<SyncListener>();
    private pollTimer: ReturnType<typeof setInterval> | null = null;
    private isRunning = false;
    private telemetry: SyncTelemetry = { totalSyncs: 0, totalConflicts: 0, totalBytesRead: 0, syncDurations: [] };

    getStatus(): SyncStatus {
        return { ...this.status };
    }

    getTelemetry(): SyncTelemetry {
        return { ...this.telemetry };
    }

    subscribe(listener: SyncListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify() {
        const status = this.getStatus();
        for (const listener of this.listeners) listener(status);
    }

    private setState(partial: Partial<SyncStatus>) {
        this.status = { ...this.status, ...partial };
        this.notify();
    }

    async start(pollIntervalMs = 60000) {
        if (this.isRunning) return;
        this.isRunning = true;

        logger.info('Sync engine started', { pollIntervalMs });

        await this.processQueue();
        await this.sync();

        window.addEventListener('online', () => {
            logger.info('Back online — running sync');
            this.sync();
        });

        this.pollTimer = setInterval(() => this.sync(), pollIntervalMs);
    }

    stop() {
        this.isRunning = false;
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
        this.setState({ state: 'idle' });
        logger.info('Sync engine stopped');
    }

    async sync() {
        if (!navigator.onLine) {
            this.setState({ state: 'offline' });
            return;
        }

        const startTime = performance.now();
        this.setState({ state: 'syncing', pendingMutations: await syncQueue.pendingCount() });

        try {
            const { changes, newPageToken } = await changeTracker.fetchChanges(
                await changeTracker.getSavedPageToken()
            );

            if (changes.length === 0 && this.status.lastSyncAt !== null) {
                this.telemetry.totalSyncs++;
                this.setState({
                    state: 'idle',
                    lastSyncAt: new Date().toISOString(),
                    pendingMutations: await syncQueue.pendingCount(),
                });
                return;
            }

            const cachedTasks = await cacheStore.getTasks();
            const cachedMap = new Map(cachedTasks.map(t => [t.id, t]));
            const mergedTasks: Task[] = [...cachedTasks];
            const mergedIds = new Set(mergedTasks.map(t => t.id));

            let conflictCount = 0;

            for (const change of changes) {
                if (change.removed) {
                    const idx = mergedTasks.findIndex(t => t.googleDriveFileId === change.fileId);
                    if (idx !== -1) mergedTasks.splice(idx, 1);
                    mergedIds.delete(change.fileId);
                    continue;
                }

                try {
                    const remoteContent = await googleDriveService.readFile(change.fileId);
                    const remoteTask: Task = { ...remoteContent, id: change.fileId, googleDriveFileId: change.fileId };

                    const localTask = cachedMap.get(change.fileId);
                    if (localTask) {
                        const conflict = await conflictResolver.checkConflict(localTask, remoteTask);
                        if (conflict) {
                            conflictCount++;
                            this.telemetry.totalConflicts++;
                            const resolved = await conflictResolver.resolve(conflict);
                            if (resolved) {
                                if (!mergedIds.has(change.fileId)) {
                                    mergedTasks.push(resolved);
                                    mergedIds.add(change.fileId);
                                } else {
                                    const idx = mergedTasks.findIndex(t => t.id === change.fileId);
                                    mergedTasks[idx] = resolved;
                                }
                            }
                            continue;
                        }
                    }

                    if (!mergedIds.has(change.fileId)) {
                        mergedTasks.push(remoteTask);
                        mergedIds.add(change.fileId);
                    } else {
                        const idx = mergedTasks.findIndex(t => t.id === change.fileId);
                        mergedTasks[idx] = remoteTask;
                    }
                } catch (e) {
                    logger.warn('Failed to read changed file', { fileId: change.fileId }, e);
                }
            }

            await cacheStore.putTasks(mergedTasks);
            await changeTracker.savePageToken(newPageToken);

            this.telemetry.totalSyncs++;
            const duration = performance.now() - startTime;
            this.telemetry.syncDurations.push(duration);
            if (this.telemetry.syncDurations.length > 100) this.telemetry.syncDurations.shift();

            this.setState({
                state: 'idle',
                lastSyncAt: new Date().toISOString(),
                pendingMutations: await syncQueue.pendingCount(),
                conflicts: conflictCount,
            });

            logger.info('Sync completed', {
                taskCount: mergedTasks.length,
                changesProcessed: changes.length,
                conflicts: conflictCount,
                durationMs: Math.round(duration),
            });
        } catch (error) {
            logger.error('Sync failed', undefined, error);
            this.setState({
                state: 'error',
                error: error instanceof Error ? error.message : 'Sync failed',
            });
        }
    }

    private async processQueue() {
        await syncQueue.processQueue(async (mutation) => {
            switch (mutation.type) {
                case 'create':
                    if (mutation.payload) {
                        await googleDriveService.createTask(mutation.payload as Omit<Task, 'id' | 'googleDriveFileId'>);
                    }
                    break;
                case 'update':
                    if (mutation.payload) {
                        await googleDriveService.updateTask(mutation.payload as Task);
                    }
                    break;
                case 'delete':
                    if (mutation.fileId) {
                        await googleDriveService.deleteTask(mutation.fileId);
                    }
                    break;
            }
        });
    }

    async enqueueOfflineCreate(task: Omit<Task, 'id' | 'googleDriveFileId'>) {
        await syncQueue.enqueue({ type: 'create', payload: task });
        this.setState({ pendingMutations: await syncQueue.pendingCount() });
    }

    async enqueueOfflineUpdate(task: Task) {
        await syncQueue.enqueue({ type: 'update', taskId: task.id, payload: task });
        this.setState({ pendingMutations: await syncQueue.pendingCount() });
    }

    async enqueueOfflineDelete(taskId: string, fileId: string) {
        await syncQueue.enqueue({ type: 'delete', taskId, fileId });
        this.setState({ pendingMutations: await syncQueue.pendingCount() });
    }
}

export const syncEngine = new SyncEngine();
