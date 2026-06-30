import axios from 'axios';
import type { Task } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { logger } from '@/lib/logger';

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API_URL = 'https://www.googleapis.com/upload/drive/v3';

const ROOT_FOLDER_NAME = 'DRIVEOS';
export const SUBFOLDERS = {
    TASKS: 'tasks',
    ATTACHMENTS: 'attachments'
};

interface DriveFile {
    id: string;
    name: string;
    parents?: string[];
    appProperties?: Record<string, string>;
    properties?: Record<string, string>;
}

const getHeaders = (contentType: string = 'application/json', token?: string) => {
    const store = useAuthStore.getState();

    // Guard: if the stored token is expired, force logout immediately
    // so the user is sent to /login rather than getting a silent 403.
    if (!token && store.isTokenExpired()) {
        store.logout();
        throw new Error('SESSION_EXPIRED');
    }

    const accessToken = token || store.user?.accessToken;
    if (!accessToken) throw new Error('Not authenticated');
    return {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': contentType,
    };
};

// Intercept 401/403 from Google Drive and force logout so the
// ProtectedRoute redirects the user back to /login.
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status;
        if ((status === 401 || status === 403) &&
            error?.config?.url?.includes('googleapis.com')) {
            useAuthStore.getState().logout();
        }
        return Promise.reject(error);
    }
);

export const googleDriveService = {
    async ensureFolderStructure(token?: string) {
        try {
            // 1. Check for root folder
            let rootFolderId = await this.findFolder(ROOT_FOLDER_NAME, 'root', token);

            if (!rootFolderId) {
                logger.info('Root folder not found, creating...');
                rootFolderId = await this.createFolder(ROOT_FOLDER_NAME, 'root', token);
            }

            if (!rootFolderId) throw new Error("Failed to ensure root folder");

            // 2. Check for subfolders
            const folderIds: Record<string, string> = { ROOT: rootFolderId };

            for (const [key, name] of Object.entries(SUBFOLDERS)) {
                let folderId = await this.findFolder(name, rootFolderId, token);
                if (!folderId) {
                    folderId = await this.createFolder(name, rootFolderId, token);
                }
                if (!folderId) throw new Error(`Failed to ensure subfolder: ${name}`);
                folderIds[key] = folderId;
            }

            return folderIds;
        } catch (error) {
            logger.error('Error ensuring folder structure', undefined, error);
            throw error;
        }
    },

    async findFolder(name: string, parentId: string = 'root', token?: string) {
        const parentQuery = `'${parentId}' in parents`;
        const query = `mimeType='application/vnd.google-apps.folder' and name='${name}' and ${parentQuery} and trashed=false`;

        const response = await axios.get(`${DRIVE_API_URL}/files`, {
            params: {
                q: query,
                fields: 'files(id, name, parents)',
                spaces: 'drive'
            },
            headers: getHeaders('application/json', token)
        });

        const files: DriveFile[] = response.data.files || [];
        if (parentId !== 'root') {
            return files.find((f: DriveFile) => f.parents?.includes(parentId))?.id || null;
        }

        return files[0]?.id || null;
    },

    async createFolder(name: string, parentId: string = 'root', token?: string) {
        const metadata = {
            name,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentId]
        };

        const response = await axios.post(`${DRIVE_API_URL}/files`, metadata, {
            headers: getHeaders('application/json', token)
        });
        return response.data.id;
    },

    async listTasks(tasksFolderId?: string) {
        if (!tasksFolderId) {
            const folders = await this.ensureFolderStructure();
            tasksFolderId = folders.TASKS;
        }

        const query = `'${tasksFolderId}' in parents and mimeType='application/json' and trashed=false`;
        const response = await axios.get(`${DRIVE_API_URL}/files`, {
            params: {
                q: query,
                fields: 'files(id, name, createdTime, modifiedTime, appProperties, properties, shared)',
                spaces: 'drive'
            },
            headers: getHeaders()
        });

        const tasks: Task[] = [];
        const files: DriveFile[] = response.data.files || [];
        for (const file of files) {
            // Check both properties and appProperties for backward compatibility
            // appProperties are private to the user/app, properties are public to any user with access to the file
            const isOurApp = file.properties?.app === 'driveos' || file.appProperties?.app === 'driveos';
            if (!isOurApp) continue;

            try {
                const content = await this.readFile(file.id);
                tasks.push({ ...content, id: file.id, googleDriveFileId: file.id });
            } catch (e) {
                logger.error('Failed to read task file', { fileId: file.id }, e);
            }
        }
        return tasks;
    },

    async readFile(fileId: string) {
        const response = await axios.get(`${DRIVE_API_URL}/files/${fileId}`, {
            params: { alt: 'media' },
            headers: getHeaders()
        });
        return response.data;
    },

    async createTask(task: Omit<Task, 'id' | 'googleDriveFileId'>, tasksFolderId?: string) {
        if (!tasksFolderId) {
            const folders = await this.ensureFolderStructure();
            tasksFolderId = folders.TASKS;
        }

        const metadata = {
            name: `task-${Date.now()}.json`,
            mimeType: 'application/json',
            parents: [tasksFolderId],
            properties: {
                app: 'driveos',
                type: 'personal'
            }
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([JSON.stringify(task)], { type: 'application/json' }));

        const response = await axios.post(`${UPLOAD_API_URL}/files?uploadType=multipart`, form, {
            headers: getHeaders('multipart/related')
        });

        return { ...task, id: response.data.id, googleDriveFileId: response.data.id };
    },

    async updateTask(task: Task) {
        if (!task.googleDriveFileId) throw new Error("Task has no Drive ID");

        const response = await axios.patch(`${UPLOAD_API_URL}/files/${task.googleDriveFileId}?uploadType=media`,
            JSON.stringify(task),
            { headers: getHeaders() }
        );
        return response.data;
    },

    async deleteTask(fileId: string) {
        await axios.delete(`${DRIVE_API_URL}/files/${fileId}`, {
            headers: getHeaders()
        });
    },

    async listFilesInFolder(folderId: string) {
        const query = `'${folderId}' in parents and trashed=false`;
        const response = await axios.get(`${DRIVE_API_URL}/files`, {
            params: {
                q: query,
                fields: 'files(id, name, mimeType)',
                spaces: 'drive'
            },
            headers: getHeaders()
        });
        return response.data.files || [];
    },

    async deleteFolderRecursive(folderId: string) {
        try {
            // 1. List all files in the folder
            const files = await this.listFilesInFolder(folderId);

            // 2. Delete each file/subfolder
            for (const file of files) {
                if (file.mimeType === 'application/vnd.google-apps.folder') {
                    await this.deleteFolderRecursive(file.id);
                } else {
                    await this.deleteTask(file.id);
                }
            }

            // 3. Delete the folder itself
            await this.deleteTask(folderId);
        } catch (error) {
            logger.error('Failed to recursively delete folder', { folderId }, error);
            throw error;
        }
    },

    async ensureTaskAttachmentsFolder(taskId: string) {
        const folders = await this.ensureFolderStructure();
        const attachmentsRootId = folders.ATTACHMENTS;

        let taskFolderId = await this.findFolder(taskId, attachmentsRootId);
        if (!taskFolderId) {
            taskFolderId = await this.createFolder(taskId, attachmentsRootId);
        }
        return taskFolderId;
    },

    async uploadAttachment(file: File, taskId: string) {
        const taskFolderId = await this.ensureTaskAttachmentsFolder(taskId);
        if (!taskFolderId) throw new Error("Could not create task attachments folder");

        const metadata = {
            name: file.name,
            mimeType: file.type,
            parents: [taskFolderId]
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);

        const response = await axios.post(`${UPLOAD_API_URL}/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,webContentLink`, form, {
            headers: getHeaders('multipart/related')
        });

        return response.data;
    },

    async getFileBlob(fileId: string): Promise<Blob> {
        const response = await axios.get(`${DRIVE_API_URL}/files/${fileId}`, {
            params: { alt: 'media' },
            headers: getHeaders(),
            responseType: 'blob'
        });
        return response.data;
    },

};
