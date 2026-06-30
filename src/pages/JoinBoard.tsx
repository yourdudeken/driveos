import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useBoardsStore } from '@/store/boardsStore';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { useToast } from '@/components/Toast';
import { Loader2, ShieldAlert, CheckCircle2, ChevronRight, Share2, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';

export default function JoinBoard() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const folderId = searchParams.get('id');
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const { requestDriveScope } = useGoogleAuth();
    const { joinBoard } = useBoardsStore();
    const { show: showToast } = useToast();

    const [status, setStatus] = useState<'checking' | 'prompt_auth' | 'joining' | 'success' | 'error'>('checking');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (!folderId) {
            setStatus('error');
            setErrorMsg('Invalid invitation link. Board ID is missing.');
            return;
        }

        if (!isAuthenticated) {
            setStatus('prompt_auth');
            return;
        }

        // If authenticated, we proceed to joining directly.
        // The joinBoard action will try reading the folder. If it fails with 403/404,
        // it means we lack scopes or permissions, and we will prompt the user to upgrade their access.
        performJoin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [folderId, isAuthenticated]);

    const performJoin = async () => {
        if (!folderId) return;
        setStatus('joining');
        try {
            await joinBoard(folderId);
            setStatus('success');
            showToast('success', 'Successfully joined the collaborative board!');
            setTimeout(() => {
                navigate('/dashboard');
            }, 2500);
        } catch (error) {
            logger.warn('Failed initial join attempt. Querying scope upgrade...', undefined, error);
            // If checking fails, they probably need to consent to the broad 'drive' scope.
            setStatus('prompt_auth');
        }
    };

    const handleGrantAccess = async () => {
        setStatus('joining');
        try {
            const success = await requestDriveScope();
            if (success && folderId) {
                await joinBoard(folderId);
                setStatus('success');
                showToast('success', 'Access granted! Joined the board.');
                setTimeout(() => {
                    navigate('/dashboard');
                }, 2000);
            } else {
                setStatus('prompt_auth');
                showToast('error', 'Google Drive access was not upgraded. Collaboration requires full Drive permissions.');
            }
        } catch (error) {
            logger.error('Failed to join board during scope request', undefined, error);
            setStatus('error');
            setErrorMsg(error instanceof Error ? error.message : 'An error occurred while joining the board.');
        }
    };

    return (
        <div className="min-h-screen w-full flex flex-col bg-black overflow-x-hidden relative font-sans">
            {/* Background blur effects */}
            <div className="fixed inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full mix-blend-screen filter blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full mix-blend-screen filter blur-[120px] animate-pulse delay-700"></div>
            </div>

            <div className="flex-1 flex items-center justify-center py-16 relative z-10">
                <div className="w-full max-w-md px-6">
                    {/* Logo */}
                    <div className="flex justify-center mb-10">
                        <img
                            src="/logo.png"
                            alt="DriveOS Logo"
                            className="w-20 h-20 drop-shadow-2xl"
                        />
                    </div>

                    <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-60"></div>

                        {status === 'checking' && (
                            <div className="text-center py-10 space-y-4">
                                <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mx-auto" />
                                <h2 className="text-xl font-bold text-white">Checking Board Invitation...</h2>
                                <p className="text-gray-400 text-sm">Validating access to the shared folder.</p>
                            </div>
                        )}

                        {status === 'prompt_auth' && (
                            <div className="space-y-6">
                                <div className="text-center">
                                    <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400 w-fit mx-auto mb-4">
                                        <Share2 className="w-7 h-7" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-white mb-2">Join Shared Board</h2>
                                    <p className="text-gray-400 text-sm">
                                        To view and edit tasks on this board, DriveOS requires permission to access shared folders in your Google Drive.
                                    </p>
                                </div>

                                {!isAuthenticated ? (
                                    <Button
                                        onClick={() => navigate('/login')}
                                        className="w-full bg-white text-black font-bold rounded-2xl py-6 hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
                                    >
                                        Log In &amp; Continue
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleGrantAccess}
                                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl py-6 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                                    >
                                        Grant Drive Permission
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                )}

                                <div className="flex gap-2.5 p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-[11px] text-gray-500">
                                    <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                                    <span>
                                        Google Drive's native security requires full access scope for applications to read files created by other accounts. Your personal folder files remain private.
                                    </span>
                                </div>
                            </div>
                        )}

                        {status === 'joining' && (
                            <div className="text-center py-10 space-y-4">
                                <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mx-auto" />
                                <h2 className="text-xl font-bold text-white">Importing Board...</h2>
                                <p className="text-gray-400 text-sm">Registering collaboration ID and downloading board tasks.</p>
                            </div>
                        )}

                        {status === 'success' && (
                            <div className="text-center py-8 space-y-4">
                                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 w-fit mx-auto">
                                    <CheckCircle2 className="w-10 h-10 animate-bounce" />
                                </div>
                                <h2 className="text-2xl font-bold text-white">Board Joined!</h2>
                                <p className="text-gray-400 text-sm">You are now collaborating on this board. Redirecting you to the dashboard...</p>
                            </div>
                        )}

                        {status === 'error' && (
                            <div className="space-y-6">
                                <div className="text-center">
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 w-fit mx-auto mb-4">
                                        <ShieldAlert className="w-8 h-8" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-white mb-2">Import Failed</h2>
                                    <p className="text-red-400 text-sm">{errorMsg || 'We could not import the board.'}</p>
                                </div>

                                <Button
                                    onClick={() => navigate('/dashboard')}
                                    className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-2xl py-5 transition-all"
                                >
                                    Return to Dashboard
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
