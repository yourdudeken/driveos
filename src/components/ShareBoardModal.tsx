import { useState, useEffect } from 'react';
import { useBoardsStore } from '@/store/boardsStore';
import { generateInvitationLink } from '@/lib/boardPermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/Toast';
import { Loader2, Share2, Copy, Trash2, Shield, User, Link, Check } from 'lucide-react';
import type { Board, BoardPermissionLevel } from '@/types';

interface ShareBoardModalProps {
    board: Board;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ShareBoardModal({ board, open, onOpenChange }: ShareBoardModalProps) {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<BoardPermissionLevel>('writer');
    const [isSharing, setIsSharing] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [copied, setCopied] = useState(false);
    const { shareBoard, removeMember, refreshMembers, boards } = useBoardsStore();
    const { show: showToast } = useToast();

    // Get the current version of this board from the store (to access member updates)
    const currentBoard = boards.find(b => b.id === board.id) || board;
    const isOwner = currentBoard.role === 'owner';

    useEffect(() => {
        if (open) {
            setIsRefreshing(true);
            refreshMembers(board.id)
                .catch(() => showToast('error', 'Failed to retrieve collaborator list.'))
                .finally(() => setIsRefreshing(false));
        }
    }, [open, board.id, refreshMembers, showToast]);

    const handleShare = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        setIsSharing(true);
        try {
            await shareBoard(board.id, email.trim(), role);
            showToast('success', `Invited ${email} to collaborate.`);
            setEmail('');
        } catch (err) {
            showToast('error', err instanceof Error ? err.message : 'Sharing request failed. Make sure the email is a valid Google account.');
        } finally {
            setIsSharing(false);
        }
    };

    const handleRemove = async (permissionId: string, memberEmail: string) => {
        try {
            await removeMember(board.id, permissionId);
            showToast('success', `Removed collaborator ${memberEmail}`);
        } catch {
            showToast('error', 'Failed to remove collaborator.');
        }
    };

    const handleCopyLink = () => {
        const link = generateInvitationLink(window.location.origin, board.id);
        navigator.clipboard.writeText(link);
        setCopied(true);
        showToast('success', 'Invitation link copied to clipboard.');
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md bg-black border border-white/10 text-white p-6 md:p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                {/* Accent glow */}
                <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full mix-blend-screen filter blur-[80px] pointer-events-none" />

                <DialogHeader className="relative z-10">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                            <Share2 className="w-5 h-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-black tracking-tight text-white">
                                Share Board
                            </DialogTitle>
                            <DialogDescription className="text-gray-400 text-xs font-medium">
                                Share "{currentBoard.name}" with other Google DriveOS users.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* Invitation Link Section */}
                <div className="mt-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl relative z-10 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Link className="w-3.5 h-3.5 text-indigo-400" />
                            Invitation Link
                        </span>
                        <span className="text-[9px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded-full font-semibold">
                            Collaborator Auth Needed
                        </span>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                        Collaborators need this link to authorize DriveOS and register the board ID in their app.
                    </p>
                    <div className="flex gap-2 pt-1">
                        <Input
                            readOnly
                            value={generateInvitationLink(window.location.origin, board.id)}
                            className="bg-white/[0.03] border-white/5 text-gray-400 text-xs rounded-xl py-5 focus-visible:ring-0 focus-visible:border-white/10"
                        />
                        <Button
                            variant="ghost"
                            onClick={handleCopyLink}
                            className="bg-white/5 hover:bg-white/10 text-white rounded-xl px-4 py-5"
                        >
                            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
                        </Button>
                    </div>
                </div>

                {/* Invite Collaborator Form (Owners only) */}
                {isOwner ? (
                    <form onSubmit={handleShare} className="mt-6 space-y-4 relative z-10">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                Invite by Google Email
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    placeholder="collaborator@gmail.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="bg-white/[0.03] border-white/10 text-white placeholder-gray-600 rounded-xl py-5 focus-visible:ring-1 focus-visible:ring-indigo-500/50"
                                />
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value as BoardPermissionLevel)}
                                    className="bg-black border border-white/10 text-xs font-semibold text-white px-3 rounded-xl focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="writer">Editor</option>
                                    <option value="reader">Viewer</option>
                                </select>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={isSharing || !email.trim()}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl py-5 transition-all shadow-md shadow-indigo-600/10"
                        >
                            {isSharing ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Sending Invite...
                                </span>
                            ) : (
                                'Send Invitation'
                            )}
                        </Button>
                    </form>
                ) : (
                    <div className="mt-6 p-4 border border-white/5 bg-white/[0.01] rounded-2xl text-center relative z-10">
                        <Shield className="w-5 h-5 text-gray-500 mx-auto mb-2" />
                        <p className="text-xs text-gray-400 font-medium">
                            Only the board owner can invite new collaborators.
                        </p>
                    </div>
                )}

                {/* Collaborators List */}
                <div className="mt-6 relative z-10">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                            Collaborators
                        </h4>
                        {isRefreshing && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
                    </div>

                    <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                        {currentBoard.members && currentBoard.members.length > 0 ? (
                            currentBoard.members.map((member) => (
                                <div
                                    key={member.email}
                                    className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 transition-all"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        {member.photoLink ? (
                                            <img
                                                src={member.photoLink}
                                                alt={member.displayName || member.email}
                                                className="w-7 h-7 rounded-full object-cover border border-white/10"
                                            />
                                        ) : (
                                            <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 text-xs">
                                                <User className="w-3.5 h-3.5" />
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-white truncate max-w-[150px]">
                                                {member.displayName || member.email.split('@')[0]}
                                            </p>
                                            <p className="text-[10px] text-gray-500 truncate max-w-[150px]">
                                                {member.email}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] bg-white/5 text-gray-400 border border-white/5 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                            {member.role}
                                        </span>
                                        {isOwner && member.role !== 'owner' && member.permissionId && (
                                            <Button
                                                variant="ghost"
                                                onClick={() => handleRemove(member.permissionId!, member.email)}
                                                className="h-8 w-8 p-0 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-xs text-gray-500 py-3">
                                No collaborators yet.
                            </p>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
