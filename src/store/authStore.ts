import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import { logger } from '@/lib/logger';

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    tokenExpiresAt: number | null;
    setUser: (user: User | null, expiresIn?: number) => void;
    isTokenExpired: () => boolean;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            isAuthenticated: false,
            tokenExpiresAt: null,

            setUser: (user, expiresIn) => {
                const tokenExpiresAt = user && expiresIn ? Date.now() + expiresIn * 1000 : null;
                set({ user, isAuthenticated: !!user, tokenExpiresAt });
                if (user) {
                    logger.info('User authenticated', { email: user.email });
                }
            },

            isTokenExpired: () => {
                const { tokenExpiresAt } = get();
                if (!tokenExpiresAt) return true;
                return Date.now() >= tokenExpiresAt - 60000;
            },

            logout: () => {
                const { user } = get();
                set({ user: null, isAuthenticated: false, tokenExpiresAt: null });
                if (user) logger.info('User logged out', { email: user.email });
            },
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                user: state.user?.id ? {
                    id: state.user.id,
                    name: state.user.name,
                    email: state.user.email,
                    picture: state.user.picture,
                    accessToken: state.user.accessToken,
                } : null,
                isAuthenticated: state.isAuthenticated,
                tokenExpiresAt: state.tokenExpiresAt,
            }),
        }
    )
);
