import axios from 'axios';
import type { Task, Board, BoardMember, BoardPermissionLevel } from '@/types';
import { normaliseDriveRole } from '@/lib/boardPermissions';
import { useAuthStore } from '@/store/authStore';
import { logger } from '@/lib/logger';

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API_URL = 'https://www.googleapis.com/upload/drive/v3';

const ROOT_FOLDER_NAME = 'DRIVEOS';
export const SUBFOLDERS = {
    TASKS: 'tasks',
    ATTACHMENTS: 'attachments',
    BOARDS: 'boards',
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

    // ── Board / collaboration ─────────────────────────────────────────────────────────────

    /**
     * Ensure DRIVEOS/boards/ exists and return its folder ID.
     * Idempotent — safe to call on every board operation.
     */
    async ensureBoardsFolder(): Promise<string> {
        const folders = await this.ensureFolderStructure();
        const rootId = folders.ROOT;
        let boardsId = await this.findFolder(SUBFOLDERS.BOARDS, rootId);
        if (!boardsId) {
            boardsId = await this.createFolder(SUBFOLDERS.BOARDS, rootId);
        }
        if (!boardsId) throw new Error('Failed to ensure boards folder');
        return boardsId;
    },

    /**
     * Create a new named board folder under DRIVEOS/boards/<uuid>/.
     * Tags it with public `properties` so collaborators can identify it
     * (appProperties are private to the creating app/user).
     */
    async createBoardFolder(name: string): Promise<Board> {
        const boardsFolder = await this.ensureBoardsFolder();
        const boardId = crypto.randomUUID();

        const metadata = {
            name: `board-${boardId}`,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [boardsFolder],
            properties: { app: 'driveos', type: 'board', boardName: name },
        };

        const response = await axios.post(`${DRIVE_API_URL}/files`, metadata, {
            headers: getHeaders(),
        });

        const folderId: string = response.data.id;
        logger.info('Board folder created', { boardId: folderId, name });

        return {
            id: folderId,
            name,
            role: 'owner',
            members: [],
            createdAt: new Date().toISOString(),
        };
    },

    /**
     * Create a task JSON file inside a board folder.
     * Identical to `createTask` but sets the parent to the board folder
     * and embeds `boardId` in the JSON content.
     */
    async createBoardTask(
        task: Omit<Task, 'id' | 'googleDriveFileId'>,
        boardFolderId: string,
    ): Promise<Task> {
        const taskWithBoard = { ...task, boardId: boardFolderId };
        const metadata = {
            name: `task-${Date.now()}.json`,
            mimeType: 'application/json',
            parents: [boardFolderId],
            properties: { app: 'driveos', type: 'board-task', boardId: boardFolderId },
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([JSON.stringify(taskWithBoard)], { type: 'application/json' }));

        const response = await axios.post(
            `${UPLOAD_API_URL}/files?uploadType=multipart`,
            form,
            { headers: getHeaders('multipart/related') },
        );

        return { ...taskWithBoard, id: response.data.id, googleDriveFileId: response.data.id };
    },

    /** List all task files in a board folder. Same filter logic as listTasks. */
    async listBoardTasks(boardFolderId: string): Promise<Task[]> {
        const query = `'${boardFolderId}' in parents and mimeType='application/json' and trashed=false`;
        const response = await axios.get(`${DRIVE_API_URL}/files`, {
            params: {
                q: query,
                fields: 'files(id,name,properties)',
                spaces: 'drive',
            },
            headers: getHeaders(),
        });

        const files: { id: string; properties?: Record<string, string> }[] = response.data.files || [];
        const tasks: Task[] = [];

        for (const file of files) {
            if (file.properties?.app !== 'driveos') continue;
            try {
                const content = await this.readFile(file.id);
                tasks.push({ ...content, id: file.id, googleDriveFileId: file.id, boardId: boardFolderId });
            } catch (e) {
                logger.error('Failed to read board task file', { fileId: file.id }, e);
            }
        }
        return tasks;
    },

    /**
     * Share a board folder with a collaborator.
     *
     * Scope note: `drive.file` allows calling `permissions.create` on files
     * the app created (the owner's session). The collaborator needs `drive`
     * scope (requested incrementally when they join via invitation link).
     */
    async shareBoard(
        folderId: string,
        email: string,
        role: BoardPermissionLevel,
    ): Promise<BoardMember> {
        const payload = { type: 'user', role, emailAddress: email };
        const response = await axios.post(
            `${DRIVE_API_URL}/files/${folderId}/permissions`,
            payload,
            {
                headers: getHeaders(),
                params: {
                    sendNotificationEmail: 'true',
                    fields: 'id,role,emailAddress,displayName,photoLink',
                },
            },
        );

        logger.info('Board shared', { folderId, email, role });
        return {
            email: response.data.emailAddress || email,
            displayName: response.data.displayName,
            photoLink: response.data.photoLink,
            role: normaliseDriveRole(response.data.role),
            permissionId: response.data.id,
        };
    },

    /** Remove a collaborator's access to a board folder. */
    async removeBoardMember(folderId: string, permissionId: string): Promise<void> {
        await axios.delete(`${DRIVE_API_URL}/files/${folderId}/permissions/${permissionId}`, {
            headers: getHeaders(),
        });
        logger.info('Board member removed', { folderId, permissionId });
    },

    /** List current permission entries for a board folder. */
    async listBoardPermissions(folderId: string): Promise<BoardMember[]> {
        const response = await axios.get(
            `${DRIVE_API_URL}/files/${folderId}/permissions`,
            {
                headers: getHeaders(),
                params: { fields: 'permissions(id,role,emailAddress,displayName,photoLink,type)' },
            },
        );

        const perms: {
            id: string;
            role: string;
            emailAddress?: string;
            displayName?: string;
            photoLink?: string;
            type: string;
        }[] = response.data.permissions || [];

        return perms
            .filter(p => p.type === 'user' && p.emailAddress)
            .map(p => ({
                email: p.emailAddress!,
                displayName: p.displayName,
                photoLink: p.photoLink,
                role: normaliseDriveRole(p.role),
                permissionId: p.id,
            }));
    },

    /**
     * Validate that the current user can access a shared board folder.
     * Called by a collaborator after following an invitation link.
     * Requires `drive` scope to have been granted (incremental auth).
     */
    async joinBoard(folderId: string): Promise<Board> {
        const response = await axios.get(
            `${DRIVE_API_URL}/files/${folderId}`,
            {
                headers: getHeaders(),
                params: { fields: 'id,name,properties,capabilities,ownedByMe' },
            },
        );

        const file = response.data as {
            id: string;
            name: string;
            properties?: Record<string, string>;
            capabilities?: { canEdit?: boolean };
            ownedByMe?: boolean;
        };

        if (file.properties?.app !== 'driveos' || file.properties?.type !== 'board') {
            throw new Error('This link does not point to a DriveOS board.');
        }

        const role: Board['role'] = file.ownedByMe
            ? 'owner'
            : file.capabilities?.canEdit ? 'writer' : 'reader';

        const boardName = file.properties.boardName || file.name;
        logger.info('Joined board', { folderId, role });

        return {
            id: folderId,
            name: boardName,
            role,
            members: [],  // populated separately via listBoardPermissions
            createdAt: new Date().toISOString(),
        };
    },

};
