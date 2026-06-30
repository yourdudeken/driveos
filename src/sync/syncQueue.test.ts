/**
 * Tests for syncQueue.ts — offline mutation queue backed by IndexedDB.
 *
 * We mock the openDB export so every test runs fully in-memory with a
 * hand-rolled IDBDatabase stub, making the suite environment-agnostic.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncQueue } from './syncQueue';

// ── minimal IDB stub ──────────────────────────────────────────────────────────

interface StubMutation {
    id?: number;
    type: string;
    taskId?: string;
    fileId?: string;
    payload?: unknown;
    createdAt: string;
    status: string;
    retryCount: number;
}

/** Mirrors the shape of an IDBRequest used by syncQueue. */
interface StubRequest<T> {
    result: T;
    onsuccess: ((this: StubRequest<T>) => void) | null;
    onerror: null;
}

let nextId = 1;
const store: Map<number, StubMutation> = new Map();

function makeIndexedDBStub() {
    return {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        transaction: (_stores: string[], _mode: string) => {
            const tx = {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                objectStore: (_name: string) => ({
                    add: (item: StubMutation) => {
                        const id = nextId++;
                        store.set(id, { ...item, id });
                        return { onsuccess: null, onerror: null };
                    },
                    put: (item: StubMutation) => {
                        if (item.id !== undefined) store.set(item.id, item);
                        return { onsuccess: null, onerror: null };
                    },
                    delete: (id: number) => {
                        store.delete(id);
                        return { onsuccess: null, onerror: null };
                    },
                    get: (id: number) => {
                        const req: StubRequest<StubMutation | undefined> = {
                            result: store.get(id),
                            onsuccess: null,
                            onerror: null,
                        };
                        // Trigger onsuccess asynchronously to match real IDB behaviour.
                        Promise.resolve().then(() => req.onsuccess?.call(req));
                        return req;
                    },
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    index: (_name: string) => ({
                        get: (value: string) => {
                            const first = [...store.values()].find(m => m.status === value);
                            const req: StubRequest<StubMutation | undefined> = {
                                result: first,
                                onsuccess: null,
                                onerror: null,
                            };
                            Promise.resolve().then(() => req.onsuccess?.call(req));
                            return req;
                        },
                        count: (value: string) => {
                            const n = [...store.values()].filter(m => m.status === value).length;
                            const req: StubRequest<number> = {
                                result: n,
                                onsuccess: null,
                                onerror: null,
                            };
                            Promise.resolve().then(() => req.onsuccess?.call(req));
                            return req;
                        },
                    }),
                }),
                oncomplete: null as (() => void) | null,
                onerror: null,
            };
            // Fire oncomplete on the next microtask tick.
            Promise.resolve().then(() => tx.oncomplete?.());
            return tx;
        },
        close: () => {/* no-op */},
    };
}

vi.mock('./cacheStore', () => ({
    openDB: vi.fn(async () => makeIndexedDBStub()),
}));

// ── tests ─────────────────────────────────────────────────────────────────────

describe('syncQueue', () => {
    beforeEach(() => {
        store.clear();
        nextId = 1;
        vi.clearAllMocks();
    });

    it('pendingCount returns 0 on an empty queue', async () => {
        expect(await syncQueue.pendingCount()).toBe(0);
    });

    it('enqueue adds a pending mutation', async () => {
        await syncQueue.enqueue({ type: 'create', payload: { taskTitle: 'Test' } });

        expect(store.size).toBe(1);
        const [item] = store.values();
        expect(item.type).toBe('create');
        expect(item.status).toBe('pending');
        expect(item.retryCount).toBe(0);
        expect(typeof item.createdAt).toBe('string');
    });

    it('pendingCount increments after enqueueing', async () => {
        await syncQueue.enqueue({ type: 'create' });
        await syncQueue.enqueue({ type: 'update', taskId: 't1' });

        expect(await syncQueue.pendingCount()).toBe(2);
    });

    it('dequeue marks the first pending mutation as processing', async () => {
        await syncQueue.enqueue({ type: 'delete', taskId: 't1', fileId: 'f1' });

        const mutation = await syncQueue.dequeue();

        expect(mutation).not.toBeUndefined();
        expect(mutation?.status).toBe('processing');
        expect(store.get(mutation!.id!)?.status).toBe('processing');
    });

    it('dequeue returns undefined when queue is empty', async () => {
        const mutation = await syncQueue.dequeue();
        expect(mutation).toBeUndefined();
    });

    it('complete removes the mutation from the store', async () => {
        await syncQueue.enqueue({ type: 'create' });
        const mutation = await syncQueue.dequeue();
        await syncQueue.complete(mutation!.id!);

        expect(store.has(mutation!.id!)).toBe(false);
    });

    it('fail marks the mutation as failed and increments retryCount', async () => {
        await syncQueue.enqueue({ type: 'update', taskId: 't1' });
        const mutation = await syncQueue.dequeue();
        await syncQueue.fail(mutation!.id!);

        const updated = store.get(mutation!.id!);
        expect(updated?.status).toBe('failed');
        expect(updated?.retryCount).toBe(1);
    });

    it('processQueue calls handler for each pending item and removes it on success', async () => {
        await syncQueue.enqueue({ type: 'create', payload: { title: 'A' } });
        await syncQueue.enqueue({ type: 'create', payload: { title: 'B' } });

        const handler = vi.fn(async () => { /* success */ });
        await syncQueue.processQueue(handler);

        expect(handler).toHaveBeenCalledTimes(2);
        // Both items should have been removed.
        expect(store.size).toBe(0);
    });

    it('processQueue stops and fails the item when handler throws', async () => {
        await syncQueue.enqueue({ type: 'create', payload: { title: 'Will Fail' } });
        await syncQueue.enqueue({ type: 'create', payload: { title: 'Not Reached' } });

        const handler = vi.fn(async () => { throw new Error('Network error'); });
        await syncQueue.processQueue(handler);

        // Handler called only once (broke out of loop on first failure).
        expect(handler).toHaveBeenCalledTimes(1);

        // The failed item should still be in the store with status=failed.
        const items = [...store.values()];
        const failed = items.find(i => i.status === 'failed');
        expect(failed).toBeDefined();
        expect(failed?.retryCount).toBe(1);
    });

    it('processQueue is a no-op when queue is empty', async () => {
        const handler = vi.fn(async () => { /* never */ });
        await syncQueue.processQueue(handler);
        expect(handler).not.toHaveBeenCalled();
    });
});
