/**
 * Pure board-permission utilities.
 * No side effects — all functions are safe to test without mocking.
 */
import type { BoardMember, BoardPermissionLevel } from '@/types';

/** Only the board owner may invite/remove members. */
export function canShare(role: BoardMember['role']): boolean {
    return role === 'owner';
}

/** Owner and editors (writers) may create/update tasks. */
export function canWrite(role: BoardMember['role']): boolean {
    return role === 'owner' || role === 'writer';
}

/** Build the request body for Drive's permissions.create endpoint. */
export function buildPermissionPayload(
    email: string,
    role: BoardPermissionLevel,
): { type: 'user'; role: BoardPermissionLevel; emailAddress: string } {
    return { type: 'user', role, emailAddress: email };
}

/**
 * Generate the invitation link a board owner sends to a collaborator.
 * The link embeds the Drive folder ID so the collaborator's app can
 * call joinBoard() without needing a Drive search.
 */
export function generateInvitationLink(baseUrl: string, folderId: string): string {
    // Normalise baseUrl — strip trailing slash, handle relative-only envs.
    const base = baseUrl.replace(/\/$/, '') || window.location.origin;
    return `${base}/board/join?id=${encodeURIComponent(folderId)}`;
}

/**
 * Extract the folder ID from an invitation link.
 * Returns null if the URL is malformed or missing the `id` param.
 */
export function parseInvitationLink(urlString: string): string | null {
    try {
        const url = new URL(urlString);
        return url.searchParams.get('id');
    } catch {
        return null;
    }
}

/**
 * Map a Drive API permission role string to the BoardMember role union.
 * Drive returns 'owner', 'organizer', 'fileOrganizer', 'writer', 'commenter', 'reader'.
 */
export function normaliseDriveRole(driveRole: string): BoardMember['role'] {
    if (driveRole === 'owner') return 'owner';
    if (driveRole === 'writer' || driveRole === 'fileOrganizer' || driveRole === 'organizer') return 'writer';
    return 'reader';
}
