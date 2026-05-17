import { useEffect, useRef } from 'react';
import { syncEngine } from '@/sync/syncEngine';
import { useTasksStore } from '@/store/tasksStore';

export function useSyncEngine() {
    const started = useRef(false);

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

        syncEngine.start(60000);

        return () => {
            unsubscribe();
            syncEngine.stop();
        };
    }, []);
}
