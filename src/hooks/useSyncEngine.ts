import { useEffect, useRef } from 'react';
import { syncEngine } from '@/sync/syncEngine';

export function useSyncEngine() {
    const started = useRef(false);

    useEffect(() => {
        if (started.current) return;
        started.current = true;

        syncEngine.start(60000);

        const handleOnline = () => syncEngine.sync();

        window.addEventListener('online', handleOnline);

        return () => {
            syncEngine.stop();
            window.removeEventListener('online', handleOnline);
        };
    }, []);
}
