import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Board, BoardMember, BoardPermissionLevel, Task } from '@/types';
import { googleDriveService } from '@/lib/googleDrive';
import { cacheStore } from '@/sync/cacheStore';
import { withRetry } from '@/lib/retry';
import { logger } from '@/lib/logger';
import { canWrite } from '@/lib/boardPermissions';

interface BoardsState {
    boards: Board[];
    /** Per-board task lists keyed by board folder ID. */
    boardTasks: Record<string, Task[]>;
    isLoading: boolean;
    error: string | null;

    /** Create a new board and add it to the list. */
    createBoard: (name: string) => Promise<Board>;
    /** Load boards from the persisted list (no Drive query needed — IDs are known). */
    hydrateBoards: () => Promise<void>;
    /** Fetch fresh task content from Drive for a specific board. */
    fetchBoardTasks: (boardId: string) => Promise<void>;
    /** Add a task to a board (owner/writer only). */
    addBoardTask: (boardId: string, task: Omit<Task, 'id' | 'googleDriveFileId'>) => Promise<Task>;
    /** Invite a collaborator. Requires drive scope on the token. */
    shareBoard: (boardId: string, email: string, role: BoardPermissionLevel) => Promise<void>;
    /** Remove a collaborator (owner only). */
    removeMember: (boardId: string, permissionId: string) => Promise<void>;
    /** Refresh the member list for a board from Drive. */
    refreshMembers: (boardId: string) => Promise<void>;
    /**
     * Join a shared board via invitation link folder ID.
     * Requires `drive` scope (incremental auth already obtained by the caller).
     */
    joinBoard: (folderId: string) => Promise<Board>;
    /** Remove a board from the local list (does NOT delete from Drive). */
    leaveBoard: (boardId: string) => void;
    setError: (error: string | null) => void;
}

export const useBoardsStore = create<BoardsState>()(
    persist(
        (set, get) => ({
            boards: [],
            boardTasks: {},
            isLoading: false,
            error: null,

            createBoard: async (name) => {
                set({ isLoading: true, error: null });
                try {
                    const board = await withRetry(() => googleDriveService.createBoardFolder(name));
                    set(state => ({ boards: [...state.boards, board], isLoading: false }));
                    logger.info('Board created', { boardId: board.id, name });
                    return board;
                } catch (error) {
                    logger.error('Failed to create board', { name }, error);
                    set({ error: 'Failed to create board', isLoading: false });
                    throw error;
                }
            },

            hydrateBoards: async () => {
                // Boards are persisted in Zustand localStorage. Re-fetch member lists
                // in the background so UI is current without blocking startup.
                const { boards } = get();
                for (const board of boards) {
                    get().refreshMembers(board.id).catch(() => {/* non-fatal */});
                }
            },

            fetchBoardTasks: async (boardId) => {
                try {
                    const tasks = await withRetry(() => googleDriveService.listBoardTasks(boardId));
                    await cacheStore.putTasks(tasks);
                    set(state => ({
                        boardTasks: { ...state.boardTasks, [boardId]: tasks },
                    }));
                } catch (error) {
                    logger.error('Failed to fetch board tasks', { boardId }, error);
                }
            },

            addBoardTask: async (boardId, task) => {
                const board = get().boards.find(b => b.id === boardId);
                if (!board) throw new Error(`Board not found: ${boardId}`);
                if (!canWrite(board.role)) throw new Error('You do not have write access to this board.');

                const saved = await withRetry(() =>
                    googleDriveService.createBoardTask({ ...task, boardId }, boardId)
                );
                await cacheStore.putTask(saved);
                set(state => ({
                    boardTasks: {
                        ...state.boardTasks,
                        [boardId]: [...(state.boardTasks[boardId] ?? []), saved],
                    },
                }));
                return saved;
            },

            shareBoard: async (boardId, email, role) => {
                const board = get().boards.find(b => b.id === boardId);
                if (!board) throw new Error(`Board not found: ${boardId}`);

                const member = await googleDriveService.shareBoard(boardId, email, role);
                set(state => ({
                    boards: state.boards.map(b =>
                        b.id === boardId
                            ? { ...b, members: [...b.members.filter(m => m.email !== email), member] }
                            : b
                    ),
                }));
                logger.info('Board shared with collaborator', { boardId, email, role });
            },

            removeMember: async (boardId, permissionId) => {
                await googleDriveService.removeBoardMember(boardId, permissionId);
                set(state => ({
                    boards: state.boards.map(b =>
                        b.id === boardId
                            ? { ...b, members: b.members.filter(m => m.permissionId !== permissionId) }
                            : b
                    ),
                }));
            },

            refreshMembers: async (boardId) => {
                try {
                    const members: BoardMember[] = await googleDriveService.listBoardPermissions(boardId);
                    set(state => ({
                        boards: state.boards.map(b => b.id === boardId ? { ...b, members } : b),
                    }));
                } catch (error) {
                    logger.warn('Could not refresh board members', { boardId }, error);
                }
            },

            joinBoard: async (folderId) => {
                const board = await googleDriveService.joinBoard(folderId);
                // Persist the joined board ID so it survives page reload.
                set(state => {
                    const alreadyJoined = state.boards.some(b => b.id === folderId);
                    return alreadyJoined
                        ? state
                        : { boards: [...state.boards, board] };
                });
                // Immediately fetch its tasks.
                await get().fetchBoardTasks(folderId);
                return board;
            },

            leaveBoard: (boardId) => {
                set(state => ({
                    boards: state.boards.filter(b => b.id !== boardId),
                    boardTasks: Object.fromEntries(
                        Object.entries(state.boardTasks).filter(([k]) => k !== boardId)
                    ),
                }));
            },

            setError: (error) => set({ error }),
        }),
        {
            name: 'boards-storage',
            // Only persist the board list (ids + roles). Tasks are re-fetched on startup.
            partialize: (state) => ({
                boards: state.boards.map(({ id, name, role, createdAt }) => ({
                    id, name, role, createdAt, members: [],
                })),
            }),
        }
    )
);
