import { useState } from 'react';
import { useConflictStore } from '@/store/conflictStore';
import { useTasksStore } from '@/store/tasksStore';
import { conflictResolver } from '@/sync/conflictResolver';
import { cacheStore } from '@/sync/cacheStore';
import { googleDriveService } from '@/lib/googleDrive';
import { logger } from '@/lib/logger';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export function ConflictResolutionModal() {
    const { pendingConflicts, dismissConflict } = useConflictStore();
    const [isResolving, setIsResolving] = useState(false);

    // Show the first pending conflict in the queue.
    const conflict = pendingConflicts[0];

    if (!conflict) return null;

    const localTask = conflict.localTask;
    const remoteTask = conflict.remoteTask;

    const handleResolve = async (strategy: 'keep_local' | 'keep_remote' | 'merged') => {
        setIsResolving(true);
        try {
            const resolved = await conflictResolver.resolve({
                ...conflict,
                resolution: strategy,
            });

            if (resolved) {
                // 1. Update the local IndexedDB cache.
                await cacheStore.putTask(resolved);

                // 2. If keeping local or merged, we need to push that decision upstream to Drive.
                // If keeping remote, we just accept the file already in Drive.
                if (strategy === 'keep_local' || strategy === 'merged') {
                    await googleDriveService.updateTask(resolved);
                    logger.info('Conflict resolved by pushing local/merged version to Drive', {
                        taskId: conflict.taskId,
                        strategy,
                    });
                } else {
                    logger.info('Conflict resolved by accepting remote version', {
                        taskId: conflict.taskId,
                    });
                }

                // 3. Hydrate state in the tasks store.
                await useTasksStore.getState().fetchTasks(true);
            }
        } catch (error) {
            logger.error('Failed to resolve conflict', { taskId: conflict.taskId, strategy }, error);
        } finally {
            setIsResolving(false);
            dismissConflict(conflict.taskId);
        }
    };

    const formatTime = (dateStr?: string) => {
        if (!dateStr) return 'Unknown';
        return new Date(dateStr).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    // Render comparison helper for visual clarity
    const ComparisonRow = ({ label, localVal, remoteVal }: { label: string; localVal: string; remoteVal: string }) => {
        const isDifferent = localVal !== remoteVal;
        return (
            <div className={`p-4 rounded-xl border transition-all ${isDifferent ? 'bg-amber-500/5 border-amber-500/20' : 'bg-white/[0.01] border-white/5'}`}>
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-500">{label}</span>
                    {isDifferent && <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold uppercase">Different</span>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p className="text-[10px] text-gray-400 mb-1">Your Version</p>
                        <p className="text-sm font-medium text-white break-words">{localVal || <span className="text-gray-600 italic">Empty</span>}</p>
                    </div>
                    <div className="border-t md:border-t-0 md:border-l border-white/5 pt-2 md:pt-0 md:pl-4">
                        <p className="text-[10px] text-gray-400 mb-1">Remote Version</p>
                        <p className="text-sm font-medium text-white break-words">{remoteVal || <span className="text-gray-600 italic">Empty</span>}</p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <Dialog open={true} onOpenChange={() => {}}>
            <DialogContent className="max-w-3xl bg-black border border-white/10 text-white p-6 md:p-8 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
                {/* Visual glow backdrop */}
                <div className="absolute -top-[20%] -left-[20%] w-[60%] h-[60%] bg-amber-500/10 rounded-full mix-blend-screen filter blur-[100px] pointer-events-none" />
                <div className="absolute -bottom-[20%] -right-[20%] w-[60%] h-[60%] bg-indigo-500/10 rounded-full mix-blend-screen filter blur-[100px] pointer-events-none" />

                <DialogHeader className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-400">
                            <AlertTriangle className="w-6 h-6 animate-pulse" />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                                Sync Conflict Detected
                            </DialogTitle>
                            <DialogDescription className="text-gray-400 text-sm font-medium">
                                Multiple edits were made to this task concurrently. Choose which version to keep.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4 my-6 relative z-10 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                    {/* Metadata Header card */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                        <div>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Your Last Change</span>
                            <span className="text-xs text-indigo-400 font-semibold">{formatTime(localTask?.updatedDate)}</span>
                        </div>
                        <div className="border-t md:border-t-0 md:border-l border-white/5 pt-2 md:pt-0 md:pl-4">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Remote Last Change</span>
                            <span className="text-xs text-indigo-400 font-semibold">{formatTime(remoteTask?.updatedDate)}</span>
                        </div>
                    </div>

                    <ComparisonRow
                        label="Task Title"
                        localVal={localTask?.taskTitle || ''}
                        remoteVal={remoteTask?.taskTitle || ''}
                    />

                    <ComparisonRow
                        label="Description"
                        localVal={localTask?.description || ''}
                        remoteVal={remoteTask?.description || ''}
                    />

                    <ComparisonRow
                        label="Status"
                        localVal={localTask?.status || ''}
                        remoteVal={remoteTask?.status || ''}
                    />

                    <ComparisonRow
                        label="Priority"
                        localVal={localTask?.priority === 1 ? 'High' : localTask?.priority === 2 ? 'Medium' : 'Low'}
                        remoteVal={remoteTask?.priority === 1 ? 'High' : remoteTask?.priority === 2 ? 'Medium' : 'Low'}
                    />
                </div>

                <div className="flex flex-col md:flex-row justify-end gap-3 relative z-10 pt-4 border-t border-white/5">
                    <Button
                        variant="ghost"
                        onClick={() => handleResolve('keep_remote')}
                        disabled={isResolving}
                        className="text-gray-400 hover:text-white hover:bg-white/5 rounded-2xl py-6 font-semibold transition-all border border-transparent hover:border-white/10"
                    >
                        Accept Remote
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => handleResolve('merged')}
                        disabled={isResolving}
                        className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-2xl py-6 font-semibold transition-all border border-transparent hover:border-indigo-500/20"
                    >
                        Merge (Keep Local Text)
                    </Button>
                    <Button
                        onClick={() => handleResolve('keep_local')}
                        disabled={isResolving}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl py-6 font-bold shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        Keep Mine
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
