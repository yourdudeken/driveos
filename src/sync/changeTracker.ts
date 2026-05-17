import { logger } from '@/lib/logger';
import { cacheStore } from './cacheStore';
import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3';

function getHeaders() {
    const token = useAuthStore.getState().user?.accessToken;
    if (!token) throw new Error('Not authenticated');
    return { Authorization: `Bearer ${token}` };
}

export interface ChangeEntry {
    fileId: string;
    removed: boolean;
    modifiedTime?: string;
}

export const changeTracker = {
    async getSavedPageToken(): Promise<string | null> {
        const token = await cacheStore.getSyncMeta('drivePageToken');
        return token ? String(token) : null;
    },

    async savePageToken(token: string): Promise<void> {
        await cacheStore.setSyncMeta('drivePageToken', token);
    },

    async fetchChanges(pageToken: string | null): Promise<{
        changes: ChangeEntry[];
        newPageToken: string;
    }> {
        const params: Record<string, string> = {
            pageToken: pageToken || '',
            fields: 'changes(fileId,removed,file(modifiedTime,name,parents)),newStartPageToken',
            pageSize: '100',
            includeRemoved: 'true',
            includeItemsFromAllDrives: 'false',
            restrictToMyDrive: 'true',
        };

        if (!pageToken) {
            // First time: get start page token
            const tokenResponse = await axios.get(`${DRIVE_API_URL}/changes/startPageToken`, {
                headers: getHeaders(),
            });
            const startToken = tokenResponse.data.startPageToken;
            await this.savePageToken(startToken);
            return { changes: [], newPageToken: startToken };
        }

        const response = await axios.get(`${DRIVE_API_URL}/changes`, {
            params,
            headers: getHeaders(),
        });

        const changes: ChangeEntry[] = (response.data.changes || []).map((c: { fileId: string; removed: boolean; file?: { modifiedTime?: string } }) => ({
            fileId: c.fileId,
            removed: c.removed,
            modifiedTime: c.file?.modifiedTime,
        }));

        const newPageToken = response.data.newStartPageToken || response.data.nextPageToken || pageToken;

        if (response.data.newStartPageToken) {
            await this.savePageToken(newPageToken);
        }

        logger.debug('Fetched Drive changes', { changeCount: changes.length, pageToken: newPageToken.slice(0, 10) });
        return { changes, newPageToken };
    },
};
