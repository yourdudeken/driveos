import { logger } from '@/lib/logger';

interface SyncMutation {
    id?: number;
    type: 'create' | 'update' | 'delete';
    taskId?: string;
    fileId?: string;
    payload?: unknown;
    createdAt: string;
    status: 'pending' | 'processing' | 'failed';
    retryCount: number;
}

const DB_NAME = 'cloudtodo';
const STORE = 'queue';

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export const syncQueue = {
    async enqueue(mutation: Omit<SyncMutation, 'id' | 'createdAt' | 'status' | 'retryCount'>): Promise<void> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readwrite');
            const store = tx.objectStore(STORE);
            store.add({ ...mutation, createdAt: new Date().toISOString(), status: 'pending', retryCount: 0 });
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },

    async dequeue(): Promise<SyncMutation | undefined> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readwrite');
            const store = tx.objectStore(STORE);
            const index = store.index('status');
            const request = index.get('pending');
            request.onsuccess = () => {
                const mutation = request.result;
                if (mutation) {
                    mutation.status = 'processing';
                    store.put(mutation);
                }
                resolve(mutation);
            };
            request.onerror = () => reject(request.error);
            tx.oncomplete = () => db.close();
        });
    },

    async complete(id: number): Promise<void> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).delete(id);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },

    async fail(id: number): Promise<void> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readwrite');
            const store = tx.objectStore(STORE);
            const request = store.get(id);
            request.onsuccess = () => {
                const mutation = request.result;
                if (!mutation) return resolve();
                mutation.status = 'failed';
                mutation.retryCount++;
                store.put(mutation);
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    },

    async pendingCount(): Promise<number> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readonly');
            const index = tx.objectStore(STORE).index('status');
            const request = index.count('pending');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async processQueue(handler: (mutation: SyncMutation) => Promise<void>): Promise<void> {
        const count = await this.pendingCount();
        if (count === 0) return;

        logger.info(`Processing ${count} queued mutations`);
        let processed = 0;

        while (processed < count) {
            const mutation = await this.dequeue();
            if (!mutation || !mutation.id) break;

            try {
                await handler(mutation);
                await this.complete(mutation.id);
                processed++;
            } catch (error) {
                logger.error('Queue item failed', { mutation }, error);
                await this.fail(mutation.id);
                break;
            }
        }

        if (processed > 0) logger.info(`Processed ${processed} queued mutations`);
    },
};
