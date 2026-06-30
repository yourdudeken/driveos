export type PriorityLevel = 1 | 2 | 3; // 1: High, 2: Medium, 3: Low

export interface AttachmentItem {
    id: string;
    name: string;
    mimeType?: string;
    url?: string;
}

export interface Attachments {
    audio: AttachmentItem[];
    images: AttachmentItem[];
    documents: AttachmentItem[];
    videos: AttachmentItem[];
}

export interface Task {
    id: string;
    taskTitle: string;
    description: string;
    dueDate: string;
    dueTime: string;
    reminder: number;
    priority: PriorityLevel;
    isStarred: boolean;
    isPinned: boolean;
    categories: string[];
    tags: string[];
    recurrence: string;
    status: 'todo' | 'in-progress' | 'completed';
    attachments: Attachments;
    createdDate: string;
    updatedDate: string;
    googleDriveFileId?: string;
    /** Set on tasks that belong to a shared board. Absent on personal tasks. */
    boardId?: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
    picture: string;
    accessToken: string;
}

export interface GoogleTokenResponse {
    access_token: string;
    expires_in: number;
    scope: string;
    token_type: string;
    id_token?: string;
}

// ── Board / collaboration types ───────────────────────────────────────────────

export type BoardPermissionLevel = 'writer' | 'reader';

export interface BoardMember {
    email: string;
    displayName?: string;
    /** current user's role on this board */
    role: 'owner' | BoardPermissionLevel;
    /** Drive permission ID — needed to revoke access */
    permissionId?: string;
    photoLink?: string;
}

export interface Board {
    /** Drive folder ID — serves as the board's primary key */
    id: string;
    name: string;
    /** The authenticated user's role on this board */
    role: 'owner' | BoardPermissionLevel;
    members: BoardMember[];
    createdAt: string;
}
