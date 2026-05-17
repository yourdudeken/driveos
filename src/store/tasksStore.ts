import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Task } from '@/types';
import { googleDriveService } from '@/lib/googleDrive';
import { cacheStore } from '@/sync/cacheStore';
import { syncEngine } from '@/sync/syncEngine';
import { withRetry } from '@/lib/retry';
import { logger } from '@/lib/logger';

interface TasksState {
    tasks: Task[];
    folderIds: Record<string, string> | null;
    viewMode: 'grid' | 'kanban';
    selectedCategory: string | null;
    isLoading: boolean;
    error: string | null;
    hydrateFromCache: () => Promise<void>;
    fetchTasks: (isBackground?: boolean) => Promise<void>;
    addTask: (task: Omit<Task, 'id' | 'googleDriveFileId'>) => Promise<Task>;
    updateTask: (task: Task) => Promise<void>;
    updateTaskStatus: (id: string, status: Task['status']) => Promise<void>;
    deleteTask: (id: string, fileId: string) => Promise<void>;
    setViewMode: (mode: 'grid' | 'kanban') => void;
    setSelectedCategory: (category: string | null) => void;
}

export const useTasksStore = create<TasksState>()(
    persist(
        (set) => ({
            tasks: [],
            folderIds: null,
            viewMode: 'grid',
            selectedCategory: null,
            isLoading: false,
            error: null,

            hydrateFromCache: async () => {
                try {
                    const cached = await cacheStore.getTasks();
                    if (cached.length > 0) {
                        set({ tasks: cached, isLoading: false });
                        logger.info('Hydrated from IndexedDB cache', { count: cached.length });
                    }
                } catch (error) {
                    logger.warn('Cache hydration failed, using localStorage', undefined, error);
                }
            },

            fetchTasks: async (isBackground = false) => {
                if (!isBackground) set({ isLoading: true, error: null });
                try {
                    const folders = await withRetry(async () => {
                        const ids = await googleDriveService.ensureFolderStructure();
                        return ids;
                    });
                    const result = await withRetry(() =>
                        googleDriveService.listTasks(folders.TASKS)
                    );
                    await cacheStore.putTasks(result);
                    set({ tasks: result, folderIds: folders, isLoading: false });
                } catch (error) {
                    logger.error('Failed to fetch tasks', undefined, error);
                    if (!isBackground) set({ error: 'Failed to fetch tasks', isLoading: false });
                }
            },

            addTask: async (newTask) => {
                set({ isLoading: true, error: null });
                try {
                    const savedTask = await withRetry(() =>
                        googleDriveService.createTask(newTask)
                    );
                    await cacheStore.putTask(savedTask);
                    set((state) => ({
                        tasks: [...state.tasks, savedTask],
                        isLoading: false,
                    }));
                    return savedTask;
                } catch (error) {
                    logger.error('Failed to add task', undefined, error);
                    // Attempt offline queue
                    try {
                        const optimisticId = crypto.randomUUID();
                        const offlineTask = { ...newTask, id: optimisticId } as Task;
                        await cacheStore.putTask(offlineTask);
                        await syncEngine.enqueueOfflineCreate(newTask);
                        set((state) => ({
                            tasks: [...state.tasks, offlineTask],
                            isLoading: false,
                        }));
                        return offlineTask;
                    } catch {
                        set({ error: 'Failed to add task', isLoading: false });
                        throw error;
                    }
                }
            },

            updateTask: async (updatedTask) => {
                set({ isLoading: true, error: null });
                try {
                    await withRetry(() => googleDriveService.updateTask(updatedTask));
                    await cacheStore.putTask(updatedTask);
                    set((state) => ({
                        tasks: state.tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t)),
                        isLoading: false,
                    }));
                } catch (error) {
                    logger.error('Failed to update task', undefined, error);
                    // Optimistic local update + queue
                    set((state) => ({
                        tasks: state.tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t)),
                        isLoading: false,
                    }));
                    await cacheStore.putTask(updatedTask);
                    await syncEngine.enqueueOfflineUpdate(updatedTask);
                }
            },

            updateTaskStatus: async (id, status) => {
                set((state) => ({
                    tasks: state.tasks.map((t) => t.id === id ? { ...t, status } : t)
                }));
                try {
                    const task = useTasksStore.getState().tasks.find(t => t.id === id);
                    if (task) {
                        await withRetry(() => googleDriveService.updateTask(task));
                        await cacheStore.putTask(task);
                    }
                } catch (error) {
                    logger.error('Failed to update task status', { taskId: id }, error);
                }
            },

            deleteTask: async (id, fileId) => {
                let { folderIds } = useTasksStore.getState();
                set({ isLoading: true, error: null });
                try {
                    if (!folderIds) {
                        folderIds = await googleDriveService.ensureFolderStructure();
                        set({ folderIds });
                    }

                    if (folderIds?.ATTACHMENTS) {
                        try {
                            const taskAttachmentsFolderId = await googleDriveService.findFolder(id, folderIds.ATTACHMENTS);
                            if (taskAttachmentsFolderId) {
                                await googleDriveService.deleteFolderRecursive(taskAttachmentsFolderId);
                            }
                        } catch (e) {
                            logger.warn('Failed to delete attachments folder', { taskId: id }, e);
                        }
                    }

                    await withRetry(() => googleDriveService.deleteTask(fileId));
                    await cacheStore.deleteTask(id);

                    set((state) => ({
                        tasks: state.tasks.filter((t) => t.id !== id),
                        isLoading: false,
                    }));
                } catch (error) {
                    logger.error('Failed to delete task', undefined, error);
                    set({ error: 'Failed to delete task', isLoading: false });
                }
            },

            setViewMode: (viewMode) => set({ viewMode }),
            setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
        }),
        {
            name: 'tasks-storage',
            partialize: (state) => ({
                tasks: state.tasks,
                folderIds: state.folderIds,
                viewMode: state.viewMode,
            }),
        }
    )
);
