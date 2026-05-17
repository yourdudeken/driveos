import { logger } from '@/lib/logger';
import { withRetry } from '@/lib/retry';
import { googleDriveService } from '@/lib/googleDrive';
import { cacheStore } from './cacheStore';
import { syncQueue } from './syncQueue';
import type { Task } from '@/types';

type SyncListener = (status: SyncStatus) => void;

export interface SyncStatus {
    state: 'idle' | 'syncing' | 'error' | 'offline';
    lastSyncAt: string | null;
    pendingMutations: number;
    error?: string;
}

class SyncEngine {
    private status: SyncStatus = { state: 'idle', lastSyncAt: null, pendingMutations: 0 };
    private listeners = new Set<SyncListener>();
    private pollTimer: ReturnType<typeof setInterval> | null = null;
    private isRunning = false;

    getStatus(): SyncStatus {
        return { ...this.status };
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

        // Process offline queue first
        await this.processQueue();

        // Initial sync
        await this.sync();

        // Periodic poll
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

        this.setState({ state: 'syncing', pendingMutations: await syncQueue.pendingCount() });

        try {
            // Hydrate from cache first if empty
            if (this.status.lastSyncAt === null) {
                const cached = await cacheStore.getTasks();
                if (cached.length > 0) {
                    // Use cached data as fast initial render
                }
            }

            // Fetch changes from Drive
            const folders = await googleDriveService.ensureFolderStructure();
            const remoteTasks = await withRetry(() =>
                googleDriveService.listTasks(folders.TASKS), { maxAttempts: 3 }
            );

            // Detect local-first task IDs not yet in remote (created offline)
            const cachedTasks = await cacheStore.getTasks();
            const remoteIds = new Set(remoteTasks.map(t => t.id));

            const mergedTasks = [...remoteTasks];

            for (const local of cachedTasks) {
                if (!remoteIds.has(local.id)) {
                    // Task exists locally but not in Drive — might be offline create or deleted remotely
                    const stillLocal = await cacheStore.getTask(local.id);
                    if (stillLocal) {
                        mergedTasks.push(local);
                    }
                }
            }

            // Write to cache
            await cacheStore.putTasks(mergedTasks);

            this.setState({
                state: 'idle',
                lastSyncAt: new Date().toISOString(),
                pendingMutations: await syncQueue.pendingCount(),
            });

            logger.info('Sync completed', { taskCount: mergedTasks.length });
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
