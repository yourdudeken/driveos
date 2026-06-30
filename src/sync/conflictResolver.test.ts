/**
 * Tests for conflictResolver.ts — the highest-risk logic in the sync layer.
 *
 * We mock cacheStore so tests are fast and fully in-memory (no IndexedDB).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { conflictResolver, ConflictReason } from './conflictResolver';
import type { Task } from '@/types';

// ── helpers ──────────────────────────────────────────────────────────────────

/** Returns a minimal valid Task with sensible defaults. */
function makeTask(overrides: Partial<Task> = {}): Task {
    return {
        id: 'task-1',
        taskTitle: 'Default Title',
        description: '',
        dueDate: '',
        dueTime: '',
        reminder: 0,
        priority: 2,
        isStarred: false,
        isPinned: false,
        categories: [],
        tags: [],
        recurrence: 'None',
        status: 'todo',
        attachments: { audio: [], images: [], documents: [], videos: [] },
        createdDate: '2024-01-01T00:00:00.000Z',
        updatedDate: '2024-01-01T00:00:00.000Z',
        googleDriveFileId: 'file-1',
        ...overrides,
    };
}

// ── mock cacheStore ───────────────────────────────────────────────────────────

const metaStore: Record<string, unknown> = {};

vi.mock('./cacheStore', () => ({
    cacheStore: {
        getSyncMeta: vi.fn(async (key: string) => metaStore[key] ?? null),
        setSyncMeta: vi.fn(async (key: string, value: unknown) => {
            metaStore[key] = value;
        }),
    },
}));

// ── tests ─────────────────────────────────────────────────────────────────────

describe('conflictResolver.checkConflict', () => {
    beforeEach(() => {
        // Reset the in-memory store and all mock call counts before each test.
        for (const key of Object.keys(metaStore)) {
            delete metaStore[key];
        }
        vi.clearAllMocks();
    });

    it('returns null on first sync (no prior meta)', async () => {
        const local = makeTask({ updatedDate: '2024-01-01T00:00:00.000Z' });
        const remote = makeTask({ updatedDate: '2024-01-01T00:00:00.000Z' });

        const result = await conflictResolver.checkConflict(local, remote);

        expect(result).toBeNull();
    });

    it('records meta on first sync', async () => {
        const local = makeTask({ updatedDate: '2024-01-02T00:00:00.000Z' });
        const remote = makeTask({ updatedDate: '2024-01-03T00:00:00.000Z' });

        await conflictResolver.checkConflict(local, remote);

        // A meta entry should have been written.
        expect(metaStore['task_meta_task-1']).toBeDefined();
    });

    it('returns null when only remote changed since last sync', async () => {
        const lastSync = '2024-01-10T00:00:00.000Z';
        // Seed meta: local was last changed on Jan 8 (before last sync on Jan 10)
        metaStore['task_meta_task-1'] = {
            localUpdatedDate: '2024-01-08T00:00:00.000Z',
            lastSyncedDate: lastSync,
        };

        const local = makeTask({ updatedDate: '2024-01-08T00:00:00.000Z' });
        const remote = makeTask({ updatedDate: '2024-01-12T00:00:00.000Z' });

        const result = await conflictResolver.checkConflict(local, remote);

        expect(result).toBeNull();
    });

    it('returns null when only local changed since last sync', async () => {
        const lastSync = '2024-01-10T00:00:00.000Z';
        metaStore['task_meta_task-1'] = {
            localUpdatedDate: '2024-01-12T00:00:00.000Z',
            lastSyncedDate: lastSync,
        };

        const local = makeTask({ updatedDate: '2024-01-12T00:00:00.000Z' });
        const remote = makeTask({ updatedDate: '2024-01-09T00:00:00.000Z' });

        const result = await conflictResolver.checkConflict(local, remote);

        expect(result).toBeNull();
    });

    it('detects BOTH_MODIFIED conflict when both sides changed after last sync', async () => {
        const lastSync = '2024-01-10T00:00:00.000Z';
        metaStore['task_meta_task-1'] = {
            localUpdatedDate: '2024-01-11T00:00:00.000Z',
            lastSyncedDate: lastSync,
        };

        const local = makeTask({
            taskTitle: 'Local Edit',
            updatedDate: '2024-01-11T00:00:00.000Z',
        });
        const remote = makeTask({
            taskTitle: 'Remote Edit',
            updatedDate: '2024-01-12T00:00:00.000Z',
        });

        const result = await conflictResolver.checkConflict(local, remote);

        expect(result).not.toBeNull();
        expect(result!.reason).toBe(ConflictReason.BOTH_MODIFIED);
        expect(result!.resolution).toBe('keep_local');
        expect(result!.taskId).toBe('task-1');
        expect(result!.localTask?.taskTitle).toBe('Local Edit');
        expect(result!.remoteTask?.taskTitle).toBe('Remote Edit');
    });

    it('writes the conflict event to conflict_log', async () => {
        const lastSync = '2024-01-10T00:00:00.000Z';
        metaStore['task_meta_task-1'] = {
            localUpdatedDate: '2024-01-11T00:00:00.000Z',
            lastSyncedDate: lastSync,
        };

        const local = makeTask({ updatedDate: '2024-01-11T00:00:00.000Z' });
        const remote = makeTask({ updatedDate: '2024-01-12T00:00:00.000Z' });

        await conflictResolver.checkConflict(local, remote);

        // The conflict_log key must now contain the event.
        const log = metaStore['conflict_log'];
        expect(Array.isArray(log)).toBe(true);
        expect((log as unknown[]).length).toBe(1);
    });

    it('conflict log grows with subsequent conflicts but is capped at 100', async () => {
        // Pre-seed the log with 99 entries.
        metaStore['conflict_log'] = Array.from({ length: 99 }, (_, i) => ({
            taskId: `old-task-${i}`,
            reason: ConflictReason.BOTH_MODIFIED,
            resolvedAt: new Date().toISOString(),
            resolution: 'keep_local',
        }));

        const lastSync = '2024-01-10T00:00:00.000Z';
        metaStore['task_meta_task-1'] = {
            localUpdatedDate: '2024-01-11T00:00:00.000Z',
            lastSyncedDate: lastSync,
        };

        const local = makeTask({ updatedDate: '2024-01-11T00:00:00.000Z' });
        const remote = makeTask({ updatedDate: '2024-01-12T00:00:00.000Z' });

        // Adding one more should bring total to 100, which equals the cap.
        await conflictResolver.checkConflict(local, remote);
        expect((metaStore['conflict_log'] as unknown[]).length).toBe(100);

        // Reset meta to trigger another conflict.
        metaStore['task_meta_task-1'] = {
            localUpdatedDate: '2024-01-11T00:00:00.000Z',
            lastSyncedDate: lastSync,
        };
        // Adding another should trim to 100 (cap enforced).
        await conflictResolver.checkConflict(local, remote);
        expect((metaStore['conflict_log'] as unknown[]).length).toBe(100);
    });
});

describe('conflictResolver.resolve', () => {
    const local = makeTask({ taskTitle: 'Local Title', description: 'Local desc' });
    const remote = makeTask({ taskTitle: 'Remote Title', description: 'Remote desc' });

    it('returns the local task for keep_local', async () => {
        const result = await conflictResolver.resolve({
            taskId: 'task-1',
            reason: ConflictReason.BOTH_MODIFIED,
            localTask: local,
            remoteTask: remote,
            resolvedAt: new Date().toISOString(),
            resolution: 'keep_local',
        });
        expect(result?.taskTitle).toBe('Local Title');
    });

    it('returns the remote task for keep_remote', async () => {
        const result = await conflictResolver.resolve({
            taskId: 'task-1',
            reason: ConflictReason.BOTH_MODIFIED,
            localTask: local,
            remoteTask: remote,
            resolvedAt: new Date().toISOString(),
            resolution: 'keep_remote',
        });
        expect(result?.taskTitle).toBe('Remote Title');
    });

    it('produces a merged task with local text and remote metadata', async () => {
        const result = await conflictResolver.resolve({
            taskId: 'task-1',
            reason: ConflictReason.BOTH_MODIFIED,
            localTask: local,
            remoteTask: remote,
            resolvedAt: new Date().toISOString(),
            resolution: 'merged',
        });
        // Text fields come from local.
        expect(result?.taskTitle).toBe('Local Title');
        expect(result?.description).toBe('Local desc');
        // updatedDate should be a fresh timestamp, not either original.
        expect(result?.updatedDate).not.toBe(local.updatedDate);
    });

    it('returns null for merged when either task is missing', async () => {
        const result = await conflictResolver.resolve({
            taskId: 'task-1',
            reason: ConflictReason.BOTH_MODIFIED,
            resolvedAt: new Date().toISOString(),
            resolution: 'merged',
        });
        expect(result).toBeNull();
    });
});

describe('conflictResolver.getConflictLog', () => {
    beforeEach(() => {
        for (const key of Object.keys(metaStore)) {
            delete metaStore[key];
        }
    });

    it('returns an empty array when no conflicts have been logged', async () => {
        const log = await conflictResolver.getConflictLog();
        expect(log).toEqual([]);
    });

    it('returns logged conflicts newest-first', async () => {
        metaStore['conflict_log'] = [
            { taskId: 'old', reason: ConflictReason.BOTH_MODIFIED, resolvedAt: '2024-01-01T00:00:00.000Z', resolution: 'keep_local' },
            { taskId: 'new', reason: ConflictReason.BOTH_MODIFIED, resolvedAt: '2024-01-02T00:00:00.000Z', resolution: 'keep_local' },
        ];

        const log = await conflictResolver.getConflictLog();
        expect(log[0].taskId).toBe('new');
        expect(log[1].taskId).toBe('old');
    });
});
