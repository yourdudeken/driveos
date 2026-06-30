import { logger } from '@/lib/logger';
import { googleDriveService } from '@/lib/googleDrive';
import { cacheStore } from './cacheStore';
import { syncQueue } from './syncQueue';
import { changeTracker } from './changeTracker';
import { conflictResolver } from './conflictResolver';
import { withRetry } from '@/lib/retry';
import { useTasksStore } from '@/store/tasksStore';
import { useBoardsStore } from '@/store/boardsStore';
import type { Task, Board } from '@/types';
import type { ConflictEvent } from './conflictResolver';

type SyncListener = (status: SyncStatus) => void;

/**
 * Called when a conflict is detected during sync.
 * For board tasks (conflict.boardId set), the full event is passed so the UI
 * can open the ConflictResolutionModal instead of auto-resolving.
 */
export type ConflictNotifier = (conflict: ConflictEvent) => void;

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
    private onlineHandler: (() => void) | null = null;
    private telemetry: SyncTelemetry = { totalSyncs: 0, totalConflicts: 0, totalBytesRead: 0, syncDurations: [] };
    private onConflict: ConflictNotifier | null = null;

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

    async start(pollIntervalMs = 60000, onConflict?: ConflictNotifier) {
        if (this.isRunning) return;
        this.isRunning = true;
        if (onConflict) this.onConflict = onConflict;

        logger.info('Sync engine started', { pollIntervalMs });

        await this.processQueue();
        await this.sync();

        this.onlineHandler = () => {
            logger.info('Back online — running sync');
            this.sync();
        };
        window.addEventListener('online', this.onlineHandler);

        this.pollTimer = setInterval(() => this.sync(), pollIntervalMs);
    }

    stop() {
        this.isRunning = false;
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
        if (this.onlineHandler) {
            window.removeEventListener('online', this.onlineHandler);
            this.onlineHandler = null;
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

            // Get current board and task folders for filtering
            const tasksFolderId = useTasksStore.getState().folderIds?.TASKS;
            const boardFolders = useBoardsStore.getState().boards as Board[];
            const boardFolderIds = boardFolders.map((b: Board) => b.id);

            let conflictCount = 0;

            for (const change of changes) {
                if (change.removed) {
                    const idx = mergedTasks.findIndex(t => t.googleDriveFileId === change.fileId);
                    if (idx !== -1) mergedTasks.splice(idx, 1);
                    mergedIds.delete(change.fileId);
                    continue;
                }

                // Filter out changes that do not belong to either the personal tasks folder
                // or any of the shared board folders we are subscribed to.
                const belongsToPersonal = change.parents?.includes(tasksFolderId || '');
                const parentBoardId = change.parents?.find(p => boardFolderIds.includes(p));

                if (!belongsToPersonal && !parentBoardId) {
                    continue;
                }

                try {
                    const remoteContent = await withRetry(() => googleDriveService.readFile(change.fileId));
                    const remoteTask: Task = {
                        ...remoteContent,
                        id: change.fileId,
                        googleDriveFileId: change.fileId,
                        ...(parentBoardId ? { boardId: parentBoardId } : {})
                    };

                    const localTask = cachedMap.get(change.fileId);
                    if (localTask) {
                        const conflict = await conflictResolver.checkConflict(localTask, remoteTask);
                        if (conflict) {
                            conflictCount++;
                            this.telemetry.totalConflicts++;

                            // Notify the UI with the full conflict event.
                            // Board conflicts (resolution='pending') are handled by ConflictResolutionModal.
                            // Personal conflicts show a toast and auto-resolve to keep_local.
                            if (this.onConflict) {
                                this.onConflict(conflict);
                            }

                            if (conflict.resolution === 'pending') {
                                // Do NOT update the cache — keep local version until user decides.
                                continue;
                            }

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
                        const task = mutation.payload as Task;
                        if (task.boardId) {
                            await googleDriveService.createBoardTask(task, task.boardId);
                        } else {
                            await googleDriveService.createTask(task);
                        }
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
