import { useState, useEffect } from 'react';
import { syncEngine, type SyncStatus } from '@/sync/syncEngine';
import { Cloud, CloudOff, RefreshCw, AlertTriangle } from 'lucide-react';

export function SyncStatus() {
    const [status, setStatus] = useState<SyncStatus>(syncEngine.getStatus());

    useEffect(() => {
        const unsub = syncEngine.subscribe(setStatus);
        return unsub;
    }, []);

    const config: Record<string, { icon: typeof Cloud; color: string; label: string }> = {
        idle: { icon: Cloud, color: 'text-green-400', label: 'Synced' },
        syncing: { icon: RefreshCw, color: 'text-indigo-400', label: 'Syncing...' },
        error: { icon: AlertTriangle, color: 'text-red-400', label: 'Sync error' },
        offline: { icon: CloudOff, color: 'text-gray-500', label: 'Offline' },
    };

    const { icon: Icon, color, label } = config[status.state];

    return (
        <button
            onClick={() => syncEngine.sync()}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${
                status.state === 'offline' ? 'border-gray-800 text-gray-600' :
                status.state === 'error' ? 'border-red-500/20 text-red-400' :
                'border-white/5 text-gray-500 hover:text-white'
            }`}
            title={status.lastSyncAt ? `Last sync: ${new Date(status.lastSyncAt).toLocaleTimeString()}` : 'Not synced yet'}
        >
            <Icon className={`w-3 h-3 ${status.state === 'syncing' ? 'animate-spin' : ''} ${color}`} />
            <span>{label}</span>
            {status.pendingMutations > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[8px]">
                    {status.pendingMutations}
                </span>
            )}
        </button>
    );
}
