import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { googleDriveService } from '@/lib/googleDrive';
import { logger } from '@/lib/logger';
import type { GoogleTokenResponse } from '@/types';
import axios from 'axios';

const SCOPES = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.install',
    'openid',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

/** Fetch the Google user profile using a fresh access token. */
async function fetchUserProfile(accessToken: string) {
    const res = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    return res.data as { sub: string; name: string; email: string; picture: string };
}

export const useGoogleAuth = () => {
    const { user, setUser, logout: storeLogout, isTokenExpired } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);
    const silentAttempted = useRef(false);

    /**
     * Shared callback invoked after any successful token grant (interactive or silent).
     * Fetches the user profile, stores the token in memory-only Zustand state,
     * and ensures the Drive folder structure exists.
     */
    const handleTokenResponse = useCallback(
        async (tokenResponse: GoogleTokenResponse, silent = false) => {
            if (!tokenResponse?.access_token) return;

            if (!silent) setIsLoading(true);
            try {
                const profile = await fetchUserProfile(tokenResponse.access_token);
                setUser(
                    {
                        id: profile.sub,
                        name: profile.name,
                        email: profile.email,
                        picture: profile.picture,
                        // accessToken lives in memory only — never reaches localStorage.
                        // authStore.partialize() intentionally omits it.
                        accessToken: tokenResponse.access_token,
                    },
                    tokenResponse.expires_in,
                );
                if (!silent) {
                    await googleDriveService.ensureFolderStructure(tokenResponse.access_token);
                }
            } catch (error) {
                logger.error(silent ? 'Silent re-auth failed' : 'Login failed', undefined, error);
            } finally {
                if (!silent) setIsLoading(false);
            }
        },
        [setUser],
    );

    /**
     * Silent re-auth on page load.
     *
     * When the user has previously signed in we persist their profile (id, name,
     * email, picture) to localStorage so the UI can render immediately.  But the
     * access token is *never* persisted — it's in-memory only.  On every page
     * reload we therefore need to re-acquire a fresh token.
     *
     * Google Identity Services supports a non-interactive ("silent") token grant
     * via `prompt: ''` + `hint: <email>`.  If the user's Google session is still
     * active this resolves immediately with no popup.  If not (e.g. cookies
     * cleared), the callback receives an error and we leave the user unauthenticated
     * — the ProtectedRoute will redirect them to /login where they can sign in
     * interactively.
     */
    useEffect(() => {
        if (silentAttempted.current) return;
        if (!user?.email || !window.google || !CLIENT_ID) return;
        if (!isTokenExpired()) return; // Already have a valid in-memory token.

        silentAttempted.current = true;

        try {
            const client = window.google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                hint: user.email,
                prompt: '',
                callback: (tokenResponse: GoogleTokenResponse) => {
                    // If Google returns an error (session expired, consent needed, etc.)
                    // the response will have an error field — we simply stay logged-out.
                    if ('error' in tokenResponse) {
                        logger.info('Silent re-auth declined — user will need to sign in interactively', {
                            error: (tokenResponse as Record<string, unknown>).error,
                        });
                        return;
                    }
                    handleTokenResponse(tokenResponse, /* silent */ true);
                },
            });
            client.requestAccessToken({ prompt: '' });
        } catch (error) {
            logger.warn('Could not initiate silent re-auth', undefined, error);
        }
    }, [user?.email, isTokenExpired, handleTokenResponse]);

    /** Interactive sign-in — opens the Google account chooser popup. */
    const login = useCallback(() => {
        if (!window.google || !CLIENT_ID) {
            logger.error('Google Token Client not initialized');
            return;
        }
        const client = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (tokenResponse: GoogleTokenResponse) => {
                handleTokenResponse(tokenResponse, /* silent */ false);
            },
        });
        client.requestAccessToken();
    }, [handleTokenResponse]);

    const logout = useCallback(() => {
        silentAttempted.current = false;
        storeLogout();
    }, [storeLogout]);

    /** Request broader drive scope incrementally for board collaboration. */
    const requestDriveScope = useCallback(() => {
        return new Promise<boolean>((resolve) => {
            if (!window.google || !CLIENT_ID) {
                logger.error('Google client not loaded');
                resolve(false);
                return;
            }
            const client = window.google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: [
                    'https://www.googleapis.com/auth/drive.file',
                    'https://www.googleapis.com/auth/drive.install',
                    'openid',
                    'https://www.googleapis.com/auth/userinfo.profile',
                    'https://www.googleapis.com/auth/userinfo.email',
                    'https://www.googleapis.com/auth/drive',
                ].join(' '),
                hint: user?.email,
                callback: (tokenResponse: GoogleTokenResponse) => {
                    if (tokenResponse && !('error' in tokenResponse) && tokenResponse.access_token) {
                        handleTokenResponse(tokenResponse, false)
                            .then(() => resolve(true))
                            .catch(() => resolve(false));
                    } else {
                        resolve(false);
                    }
                },
            });
            client.requestAccessToken();
        });
    }, [user?.email, handleTokenResponse]);

    return { login, logout, isLoading, requestDriveScope };
};
