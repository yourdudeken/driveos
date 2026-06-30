import { GoogleTokenResponse } from '@/types';

/// <reference types="vite/client" />

declare global {
    interface Window {
        google?: {
            accounts: {
                oauth2: {
                    initTokenClient: (config: {
                        client_id: string;
                        scope: string;
                        callback: (response: GoogleTokenResponse) => void;
                        /** Set to '' for a silent/non-interactive token refresh. */
                        prompt?: string;
                        /** Hint to pre-fill the account chooser with the known user email. */
                        hint?: string;
                    }) => {
                        requestAccessToken: (overrides?: { prompt?: string }) => void;
                    };
                    revoke: (accessToken: string, done: () => void) => void;
                };
            };
        };
    }
}
