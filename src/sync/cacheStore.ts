import type { Task } from '@/types';

const DB_NAME = 'driveos';
const DB_VERSION = 2;

let db: IDBDatabase | null = null;

export function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (db) return resolve(db);

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const database = (event.target as IDBOpenDBRequest).result;
            const oldVersion = event.oldVersion;

            // Version 1 — initial schema
            if (oldVersion < 1) {
                const taskStore = database.createObjectStore('tasks', { keyPath: 'id' });
                taskStore.createIndex('status', 'status', { unique: false });
                taskStore.createIndex('updatedDate', 'updatedDate', { unique: false });

                database.createObjectStore('sync', { keyPath: 'key' });

                const queue = database.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
                queue.createIndex('status', 'status', { unique: false });

                database.createObjectStore('blobs', { keyPath: 'id' });
            }

            // Version 2 — boards support
            if (oldVersion < 2) {
                // Boards metadata store (key-value, like sync)
                if (!database.objectStoreNames.contains('boards')) {
                    database.createObjectStore('boards', { keyPath: 'key' });
                }
                // Add boardId index to existing tasks store so we can
                // efficiently query "all tasks for board X".
                const tx = (event.target as IDBOpenDBRequest).transaction!;
                if (database.objectStoreNames.contains('tasks')) {
                    const taskStore = tx.objectStore('tasks');
                    if (!taskStore.indexNames.contains('boardId')) {
                        taskStore.createIndex('boardId', 'boardId', { unique: false });
                    }
                }
            }
        };

        request.onsuccess = (event) => {
            db = (event.target as IDBOpenDBRequest).result;
            resolve(db!);
        };

        request.onerror = () => reject(request.error);
    });
}

export const cacheStore = {
    async getTasks(): Promise<Task[]> {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const tx = database.transaction('tasks', 'readonly');
            const store = tx.objectStore('tasks');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async getTask(id: string): Promise<Task | undefined> {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const tx = database.transaction('tasks', 'readonly');
            const store = tx.objectStore('tasks');
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result || undefined);
            request.onerror = () => reject(request.error);
        });
    },

    async putTask(task: Task): Promise<void> {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const tx = database.transaction('tasks', 'readwrite');
            const store = tx.objectStore('tasks');
            store.put(task);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },

    async putTasks(tasks: Task[]): Promise<void> {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const tx = database.transaction('tasks', 'readwrite');
            const store = tx.objectStore('tasks');
            for (const task of tasks) store.put(task);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },

    async deleteTask(id: string): Promise<void> {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const tx = database.transaction('tasks', 'readwrite');
            const store = tx.objectStore('tasks');
            store.delete(id);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },

    async getSyncMeta(key: string): Promise<unknown> {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const tx = database.transaction('sync', 'readonly');
            const store = tx.objectStore('sync');
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result?.value);
            request.onerror = () => reject(request.error);
        });
    },

    async setSyncMeta(key: string, value: unknown): Promise<void> {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const tx = database.transaction('sync', 'readwrite');
            const store = tx.objectStore('sync');
            store.put({ key, value });
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },

    async clear(): Promise<void> {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const tx = database.transaction(['tasks', 'sync', 'queue', 'blobs', 'boards'], 'readwrite');
            tx.objectStore('tasks').clear();
            tx.objectStore('sync').clear();
            tx.objectStore('queue').clear();
            tx.objectStore('blobs').clear();
            tx.objectStore('boards').clear();
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },

    /** Persist a board record (metadata) keyed by its Drive folder ID. */
    async putBoardMeta(boardId: string, value: unknown): Promise<void> {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const tx = database.transaction('boards', 'readwrite');
            tx.objectStore('boards').put({ key: boardId, value });
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },

    /** Retrieve a board record by Drive folder ID. */
    async getBoardMeta(boardId: string): Promise<unknown> {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const tx = database.transaction('boards', 'readonly');
            const req = tx.objectStore('boards').get(boardId);
            req.onsuccess = () => resolve(req.result?.value ?? null);
            req.onerror = () => reject(req.error);
        });
    },

    /** Retrieve all tasks for a specific board from the local cache. */
    async getTasksByBoard(boardId: string): Promise<Task[]> {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const tx = database.transaction('tasks', 'readonly');
            const index = tx.objectStore('tasks').index('boardId');
            const req = index.getAll(boardId);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },
};
