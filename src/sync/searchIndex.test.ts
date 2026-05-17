import { describe, it, expect, beforeEach } from 'vitest';
import { searchIndex } from '@/sync/searchIndex';
import type { Task } from '@/types';

const makeTask = (overrides: Partial<Task> = {}): Task => ({
    id: '1',
    taskTitle: 'Test task',
    description: 'A test description',
    dueDate: '2026-06-01',
    dueTime: '',
    reminder: 30,
    priority: 2,
    isStarred: false,
    isPinned: false,
    categories: ['work'],
    tags: ['urgent'],
    recurrence: 'None',
    status: 'todo',
    attachments: { audio: [], images: [], documents: [], videos: [] },
    createdDate: new Date().toISOString(),
    updatedDate: new Date().toISOString(),
    ...overrides,
});

describe('searchIndex', () => {
    beforeEach(() => {
        searchIndex.rebuild([]);
    });

    it('returns all tasks for empty query', () => {
        const tasks = [makeTask({ id: '1' }), makeTask({ id: '2' })];
        searchIndex.rebuild(tasks);
        expect(searchIndex.search('')).toHaveLength(2);
    });

    it('filters by title', () => {
        const tasks = [
            makeTask({ id: '1', taskTitle: 'Design review' }),
            makeTask({ id: '2', taskTitle: 'Code review' }),
        ];
        searchIndex.rebuild(tasks);
        const results = searchIndex.search('design');
        expect(results).toHaveLength(1);
        expect(results[0].taskTitle).toBe('Design review');
    });

    it('filters by description', () => {
        const tasks = [
            makeTask({ id: '1', description: 'Fix login bug' }),
            makeTask({ id: '2', description: 'Add new feature' }),
        ];
        searchIndex.rebuild(tasks);
        expect(searchIndex.search('bug')).toHaveLength(1);
        expect(searchIndex.search('feature')).toHaveLength(1);
    });

    it('filters by category', () => {
        const tasks = [
            makeTask({ id: '1', categories: ['personal'] }),
            makeTask({ id: '2', categories: ['work'] }),
        ];
        searchIndex.rebuild(tasks);
        expect(searchIndex.search('personal')).toHaveLength(1);
    });

    it('matches multiple terms', () => {
        const tasks = [
            makeTask({ id: '1', taskTitle: 'Design system', categories: ['work'] }),
            makeTask({ id: '2', taskTitle: 'Design review', categories: ['personal'] }),
        ];
        searchIndex.rebuild(tasks);
        expect(searchIndex.search('design work')).toHaveLength(1);
    });

    it('is case insensitive', () => {
        const tasks = [makeTask({ id: '1', taskTitle: 'DESIGN Review' })];
        searchIndex.rebuild(tasks);
        expect(searchIndex.search('design')).toHaveLength(1);
    });
});
