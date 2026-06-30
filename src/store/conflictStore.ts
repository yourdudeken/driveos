/**
 * Stores board task conflicts that require an explicit user decision.
 * Board conflicts are NOT auto-resolved (unlike personal single-device conflicts).
 */
import { create } from 'zustand';
import type { ConflictEvent } from '@/sync/conflictResolver';

interface ConflictStoreState {
    /** Conflicts awaiting user resolution, ordered oldest-first. */
    pendingConflicts: ConflictEvent[];
    /** Add a new conflict to the queue (deduplicated by taskId). */
    addConflict: (event: ConflictEvent) => void;
    /** Remove the conflict once the user has made a choice. */
    dismissConflict: (taskId: string) => void;
}

export const useConflictStore = create<ConflictStoreState>()((set, get) => ({
    pendingConflicts: [],

    addConflict: (event) =>
        set((state) => {
            // Deduplicate: if a conflict for this task is already pending, keep the newer one.
            const filtered = state.pendingConflicts.filter(c => c.taskId !== event.taskId);
            return { pendingConflicts: [...filtered, event] };
        }),

    dismissConflict: (taskId) => {
        const conflict = get().pendingConflicts.find(c => c.taskId === taskId);
        if (!conflict) return;
        set(state => ({
            pendingConflicts: state.pendingConflicts.filter(c => c.taskId !== taskId),
        }));
    },
}));
