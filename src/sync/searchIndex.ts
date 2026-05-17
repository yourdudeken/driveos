import type { Task } from '@/types';

export interface SearchIndex {
    search(query: string): Task[];
}

class FullTextIndex implements SearchIndex {
    private tasks: Task[] = [];

    rebuild(tasks: Task[]) {
        this.tasks = tasks;
    }

    search(query: string): Task[] {
        if (!query.trim()) return this.tasks;

        const lower = query.toLowerCase();
        const terms = lower.split(/\s+/).filter(Boolean);

        return this.tasks.filter(task => {
            const searchable = [
                task.taskTitle,
                task.description,
                ...task.categories,
                ...task.tags,
                task.status,
            ].filter(Boolean).join(' ').toLowerCase();

            return terms.every(term => searchable.includes(term));
        });
    }
}

export const searchIndex = new FullTextIndex();
