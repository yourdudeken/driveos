import type { Task } from '@/types';

const DB_NAME = 'cloudtodo';
const DB_VERSION = 1;

let db: IDBDatabase | null = null;

export function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (db) return resolve(db);

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const database = (event.target as IDBOpenDBRequest).result;

            if (!database.objectStoreNames.contains('tasks')) {
                const store = database.createObjectStore('tasks', { keyPath: 'id' });
                store.createIndex('status', 'status', { unique: false });
                store.createIndex('updatedDate', 'updatedDate', { unique: false });
            }

            if (!database.objectStoreNames.contains('sync')) {
                database.createObjectStore('sync', { keyPath: 'key' });
            }

            if (!database.objectStoreNames.contains('queue')) {
                const queue = database.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
                queue.createIndex('status', 'status', { unique: false });
            }

            if (!database.objectStoreNames.contains('blobs')) {
                database.createObjectStore('blobs', { keyPath: 'id' });
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
            const tx = database.transaction(['tasks', 'sync', 'queue', 'blobs'], 'readwrite');
            tx.objectStore('tasks').clear();
            tx.objectStore('sync').clear();
            tx.objectStore('queue').clear();
            tx.objectStore('blobs').clear();
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },
};
