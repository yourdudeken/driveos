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
    /**
     * 'keep_local'  — personal task, auto-resolved in favour of local.
     * 'keep_remote' — caller explicitly chose remote.
     * 'merged'      — field-level merge applied.
     * 'pending'     — board task conflict awaiting user decision via ConflictResolutionModal.
     */
    resolution: 'keep_local' | 'keep_remote' | 'merged' | 'pending';
    /** Present when the conflicting task belongs to a shared board. */
    boardId?: string;
}

interface StoredMeta {
    localUpdatedDate: string;
    lastSyncedDate: string;
}

const META_PREFIX = 'task_meta_';
const CONFLICT_LOG_KEY = 'conflict_log';
/** Maximum entries kept in the conflict log to avoid unbounded growth. */
const MAX_LOG_ENTRIES = 100;

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

/** Append a conflict event to the persistent conflict log. */
async function appendToConflictLog(event: ConflictEvent): Promise<void> {
    try {
        const existing = await cacheStore.getSyncMeta(CONFLICT_LOG_KEY);
        const log: ConflictEvent[] = Array.isArray(existing) ? (existing as ConflictEvent[]) : [];
        log.push(event);
        // Keep only the most recent entries so the log doesn't grow without bound.
        const trimmed = log.slice(-MAX_LOG_ENTRIES);
        await cacheStore.setSyncMeta(CONFLICT_LOG_KEY, trimmed);
    } catch (err) {
        // Non-fatal — log the error but don't let logging failure break sync.
        logger.warn('Failed to write conflict log entry', { taskId: event.taskId }, err);
    }
}

export const conflictResolver = {
    async checkConflict(local: Task, remote: Task): Promise<ConflictEvent | null> {
        const meta = await getTaskMeta(local.id);

        if (!meta) {
            // First sync — no conflict baseline yet.
            await setTaskMeta(local.id, {
                localUpdatedDate: local.updatedDate,
                lastSyncedDate: remote.updatedDate,
            });
            return null;
        }

        // Remote was deleted but local exists — handled by the caller before reaching here.

        if (
            new Date(local.updatedDate) > new Date(meta.lastSyncedDate) &&
            new Date(remote.updatedDate) > new Date(meta.lastSyncedDate)
        ) {
            // Both sides modified since last sync — this is a real conflict.
            logger.warn('Conflict detected', {
                taskId: local.id,
                localDate: local.updatedDate,
                remoteDate: remote.updatedDate,
            });

            const isBoardTask = !!(local.boardId || remote.boardId);

            const event: ConflictEvent = {
                taskId: local.id,
                reason: ConflictReason.BOTH_MODIFIED,
                localTask: local,
                remoteTask: remote,
                resolvedAt: new Date().toISOString(),
                // Board conflicts are surfaced to the user via the ConflictResolutionModal.
                // Personal conflicts fall back to keep_local (safe default across own devices).
                resolution: isBoardTask ? 'pending' : 'keep_local',
                boardId: local.boardId ?? remote.boardId,
            };

            await setTaskMeta(local.id, {
                localUpdatedDate: local.updatedDate,
                lastSyncedDate: new Date().toISOString(),
            });

            // Persist the conflict event so getConflictLog() has real data.
            await appendToConflictLog(event);

            return event;
        }

        // No conflict — update last synced timestamp.
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
            // Naive merge: take remote metadata but preserve local text edits.
            return {
                ...event.remoteTask,
                taskTitle: event.localTask.taskTitle,
                description: event.localTask.description,
                updatedDate: new Date().toISOString(),
            };
        }
        // 'pending' — board conflict awaiting user decision. Return null so
        // the sync engine keeps the current local cache untouched.
        return null;
    },

    async recordSynced(taskId: string, updatedDate: string): Promise<void> {
        await setTaskMeta(taskId, {
            localUpdatedDate: updatedDate,
            lastSyncedDate: updatedDate,
        });
    },

    /** Returns the full conflict log, newest-first. */
    async getConflictLog(): Promise<ConflictEvent[]> {
        try {
            const log = await cacheStore.getSyncMeta(CONFLICT_LOG_KEY);
            const entries = (log as ConflictEvent[]) || [];
            // Return newest-first for easier inspection.
            return [...entries].reverse();
        } catch {
            return [];
        }
    },
};
