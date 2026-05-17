import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { googleDriveService } from '@/lib/googleDrive';
import type { GoogleTokenResponse } from '@/types';
import axios from 'axios';

const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.install openid https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export const useGoogleAuth = () => {
    const { setUser, logout: storeLogout, isTokenExpired } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);
    const [tokenClient, setTokenClient] = useState<{ requestAccessToken: () => void } | null>(null);

    useEffect(() => {
        if (window.google && CLIENT_ID) {
            const client = window.google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: async (tokenResponse: GoogleTokenResponse) => {
                    if (tokenResponse && tokenResponse.access_token) {
                        setIsLoading(true);
                        try {
                            const userInfoResponse = await axios.get(
                                'https://www.googleapis.com/oauth2/v3/userinfo',
                                {
                                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                                }
                            );

                            const profile = userInfoResponse.data;
                            const user = {
                                id: profile.sub,
                                name: profile.name,
                                email: profile.email,
                                picture: profile.picture,
                                accessToken: tokenResponse.access_token,
                            };

                            setUser(user, tokenResponse.expires_in);

                            await googleDriveService.ensureFolderStructure(tokenResponse.access_token);

                        } catch (error) {
                            console.error('Login failed', error);
                        } finally {
                            setIsLoading(false);
                        }
                    }
                },
            });
            setTokenClient(client);
        }
    }, [setUser]);

    const login = useCallback(() => {
        if (isTokenExpired() && window.google) {
            const client = window.google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: async (tokenResponse: GoogleTokenResponse) => {
                    if (tokenResponse && tokenResponse.access_token) {
                        setIsLoading(true);
                        try {
                            const userInfoResponse = await axios.get(
                                'https://www.googleapis.com/oauth2/v3/userinfo',
                                { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } }
                            );
                            const profile = userInfoResponse.data;
                            setUser({
                                id: profile.sub,
                                name: profile.name,
                                email: profile.email,
                                picture: profile.picture,
                                accessToken: tokenResponse.access_token,
                            }, tokenResponse.expires_in);
                        } catch (error) {
                            console.error('Re-auth failed', error);
                        } finally {
                            setIsLoading(false);
                        }
                    }
                },
            });
            client.requestAccessToken();
        } else if (tokenClient) {
            tokenClient.requestAccessToken();
        } else {
            console.error('Google Token Client not initialized');
        }
    }, [tokenClient, isTokenExpired, setUser]);

    const logout = useCallback(() => {
        storeLogout();
    }, [storeLogout]);

    return { login, logout, isLoading };
};
