import { useEffect, useRef } from 'react';
import { syncEngine } from '@/sync/syncEngine';
import { useTasksStore } from '@/store/tasksStore';
import { useToast } from '@/components/Toast';
import { useConflictStore } from '@/store/conflictStore';
import type { ConflictEvent } from '@/sync/conflictResolver';

export function useSyncEngine() {
    const started = useRef(false);
    const { show: showToast } = useToast();

    useEffect(() => {
        if (started.current) return;
        started.current = true;

        let prevState = 'idle';

        const unsubscribe = syncEngine.subscribe((status) => {
            if (prevState === 'syncing' && status.state === 'idle') {
                useTasksStore.getState().fetchTasks(true);
            }
            prevState = status.state;
        });

        /**
         * Surface conflicts to the user instead of silently discarding remote edits.
         * For board tasks, conflicts are routed to the ConflictResolutionModal.
         * For personal tasks, a toast explains that the local version won.
         */
        const onConflict = (conflict: ConflictEvent) => {
            if (conflict.boardId) {
                // Route board conflict to conflictStore for user review.
                useConflictStore.getState().addConflict(conflict);
            } else {
                const remoteDate = conflict.remoteTask?.updatedDate || conflict.resolvedAt;
                const remoteFormatted = new Date(remoteDate).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                });
                showToast(
                    'warning',
                    `Sync conflict: a remote edit from ${remoteFormatted} was overridden by your local version. Check Conflict Log for details.`,
                );
            }
        };

        syncEngine.start(60000, onConflict);

        return () => {
            unsubscribe();
            syncEngine.stop();
        };
    // showToast reference is stable (useCallback in ToastProvider) so it's safe here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
}
