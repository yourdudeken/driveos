import { describe, it, expect } from 'vitest';
import {
    canShare,
    canWrite,
    buildPermissionPayload,
    generateInvitationLink,
    parseInvitationLink,
    normaliseDriveRole,
} from './boardPermissions';

describe('boardPermissions pure functions', () => {
    describe('parseInvitationLink', () => {
        it('should extract the folder ID from a valid join link', () => {
            const url = 'https://driveos.app/board/join?id=folder123';
            expect(parseInvitationLink(url)).toBe('folder123');
        });

        it('should return null if the id param is missing', () => {
            const url = 'https://driveos.app/board/join?other=param';
            expect(parseInvitationLink(url)).toBeNull();
        });

        it('should return null for invalid URLs', () => {
            expect(parseInvitationLink('invalid-url-string')).toBeNull();
        });
    });

    describe('generateInvitationLink', () => {
        it('should generate a correct join URL structure', () => {
            const origin = 'https://example.com';
            const folderId = 'abc-123';
            const expected = 'https://example.com/board/join?id=abc-123';
            expect(generateInvitationLink(origin, folderId)).toBe(expected);
        });
    });

    describe('canShare', () => {
        it('should allow owners to share', () => {
            expect(canShare('owner')).toBe(true);
        });

        it('should disallow writers/editors to share', () => {
            expect(canShare('writer')).toBe(false);
        });

        it('should disallow readers/viewers to share', () => {
            expect(canShare('reader')).toBe(false);
        });
    });

    describe('canWrite', () => {
        it('should allow owners to write', () => {
            expect(canWrite('owner')).toBe(true);
        });

        it('should allow writers to write', () => {
            expect(canWrite('writer')).toBe(true);
        });

        it('should disallow readers/viewers to write', () => {
            expect(canWrite('reader')).toBe(false);
        });
    });

    describe('buildPermissionPayload', () => {
        it('should build viewer (reader) payloads correctly', () => {
            const payload = buildPermissionPayload('collab@gmail.com', 'reader');
            expect(payload).toEqual({
                type: 'user',
                role: 'reader',
                emailAddress: 'collab@gmail.com',
            });
        });

        it('should build editor (writer) payloads correctly', () => {
            const payload = buildPermissionPayload('collab@gmail.com', 'writer');
            expect(payload).toEqual({
                type: 'user',
                role: 'writer',
                emailAddress: 'collab@gmail.com',
            });
        });
    });

    describe('normaliseDriveRole', () => {
        it('should normalise owner role', () => {
            expect(normaliseDriveRole('owner')).toBe('owner');
        });

        it('should normalise writer, organizer, and fileOrganizer roles to writer', () => {
            expect(normaliseDriveRole('writer')).toBe('writer');
            expect(normaliseDriveRole('organizer')).toBe('writer');
            expect(normaliseDriveRole('fileOrganizer')).toBe('writer');
        });

        it('should normalise other roles to reader', () => {
            expect(normaliseDriveRole('reader')).toBe('reader');
            expect(normaliseDriveRole('commenter')).toBe('reader');
            expect(normaliseDriveRole('other')).toBe('reader');
        });
    });
});
