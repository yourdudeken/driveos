import { logger } from '@/lib/logger';
import { cacheStore } from './cacheStore';
import type { Task } from '@/types';

export const ConflictReason = {
    REMOTE_DELETED: 'remote_deleted',
    LOCAL_DELETED: 'local_deleted',
    MODIFIED_SINCE_SYNC: 'modified_since_sync',
    BOTH_MODIFIED: 'both_modified',
} as const;

export type ConflictReason = (typeof ConflictReason)[keyof typeof ConflictReason];

export interface ConflictEvent {
    taskId: string;
    reason: ConflictReason;
    localTask?: Task;
    remoteTask?: Task;
    resolvedAt: string;
    resolution: 'keep_local' | 'keep_remote' | 'merged';
}

interface StoredMeta {
    localUpdatedDate: string;
    lastSyncedDate: string;
}

const META_PREFIX = 'task_meta_';

async function getTaskMeta(taskId: string): Promise<StoredMeta | null> {
    try {
        const val = await cacheStore.getSyncMeta(META_PREFIX + taskId);
        return val ? (val as StoredMeta) : null;
    } catch {
        return null;
    }
}

async function setTaskMeta(taskId: string, meta: StoredMeta): Promise<void> {
    await cacheStore.setSyncMeta(META_PREFIX + taskId, meta);
}

export const conflictResolver = {
    async checkConflict(local: Task, remote: Task): Promise<ConflictEvent | null> {
        const meta = await getTaskMeta(local.id);

        if (!meta) {
            // First sync — no conflict
            await setTaskMeta(local.id, {
                localUpdatedDate: local.updatedDate,
                lastSyncedDate: remote.updatedDate,
            });
            return null;
        }

        // Remote was deleted but local exists
        // (This is checked by the caller before calling this)

        if (new Date(local.updatedDate) > new Date(meta.lastSyncedDate) &&
            new Date(remote.updatedDate) > new Date(meta.lastSyncedDate)) {
            // Both modified since last sync — conflict!
            logger.warn('Conflict detected', { taskId: local.id, localDate: local.updatedDate, remoteDate: remote.updatedDate });

            const event: ConflictEvent = {
                taskId: local.id,
                reason: ConflictReason.BOTH_MODIFIED,
                localTask: local,
                remoteTask: remote,
                resolvedAt: new Date().toISOString(),
                resolution: 'keep_local',
            };

            await setTaskMeta(local.id, {
                localUpdatedDate: local.updatedDate,
                lastSyncedDate: new Date().toISOString(),
            });

            return event;
        }

        // No conflict — update last synced
        await setTaskMeta(local.id, {
            localUpdatedDate: local.updatedDate,
            lastSyncedDate: remote.updatedDate,
        });

        return null;
    },

    async resolve(event: ConflictEvent): Promise<Task | null> {
        if (event.resolution === 'keep_local') {
            return event.localTask || null;
        }
        if (event.resolution === 'keep_remote') {
            return event.remoteTask || null;
        }
        if (event.resolution === 'merged' && event.localTask && event.remoteTask) {
            return {
                ...event.remoteTask,
                taskTitle: event.localTask.taskTitle,
                description: event.localTask.description,
                updatedDate: new Date().toISOString(),
            };
        }
        return null;
    },

    async recordSynced(taskId: string, updatedDate: string): Promise<void> {
        await setTaskMeta(taskId, {
            localUpdatedDate: updatedDate,
            lastSyncedDate: updatedDate,
        });
    },

    async getConflictLog(): Promise<ConflictEvent[]> {
        try {
            const log = await cacheStore.getSyncMeta('conflict_log');
            return (log as ConflictEvent[]) || [];
        } catch {
            return [];
        }
    },
};
