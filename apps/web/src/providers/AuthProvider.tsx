'use client';

import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

import { publicGetMe, publicLogout } from '@/lib/api/public.service';
import { STORAGE_KEYS } from '@mad/shared';
import { isTokenExpired } from '@mad/utils';

import type { AuthUser } from '../types/auth';


interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  onboardingRequired: boolean;
  setOnboardingRequired: (v: boolean) => void;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  onboardingRequired: false,
  setOnboardingRequired: () => {},
  login: () => {},
  logout: () => {},
});


// Consolidated isTokenExpired imported from @mad/utils

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingRequired, setOnboardingRequired] = useState(false);

  // Hydrate session and execute silent background refresh validation on mount
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const storedToken = localStorage.getItem(STORAGE_KEYS.USER_TOKEN);
        if (storedToken) {
          if (isTokenExpired(storedToken)) {
            // Attempt to trigger silent refresh via axios interceptor
            const { onboardingRequired: obReq, ...userProfile } = await publicGetMe();
            const newToken = localStorage.getItem(STORAGE_KEYS.USER_TOKEN);
            setToken(newToken);
            setUser(userProfile);
            setOnboardingRequired(!!obReq);
            localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userProfile));
          } else {
            setToken(storedToken);
            const storedUser = localStorage.getItem(STORAGE_KEYS.USER_DATA);
            if (storedUser) setUser(JSON.parse(storedUser));
            
            // Re-validate profile in background
            const { onboardingRequired: obReq, ...userProfile } = await publicGetMe();
            setUser(userProfile);
            setOnboardingRequired(!!obReq);
            localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userProfile));
          }
        } else {
          // No short-lived access token, check if we had a session before calling auth/me.
          // This avoids sending a wasteful GET /auth/me -> 401 for anonymous guests.
          const hasSession = localStorage.getItem(STORAGE_KEYS.USER_DATA);
          if (hasSession) {
            const { onboardingRequired: obReq, ...userProfile } = await publicGetMe();
            const newToken = localStorage.getItem(STORAGE_KEYS.USER_TOKEN);
            if (newToken) {
              setToken(newToken);
              setUser(userProfile);
              setOnboardingRequired(!!obReq);
              localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userProfile));
            }
          }
        }
      } catch (err) {
        let shouldEvict = false;
        if (axios.isAxiosError(err)) {
          const status = err.response?.status;
          if (status === 401 || status === 403) {
            shouldEvict = true;
          }
        }
        if (shouldEvict) {
          // Clear stale local sessions if unauthenticated
          setToken(null);
          setUser(null);
          setOnboardingRequired(false);
          localStorage.removeItem(STORAGE_KEYS.USER_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.USER_DATA);
        } else {
          console.warn('Session hydration warning: Transient error encountered. Session preserved.', err);
        }
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();

    // Listen for global auth expired events from Axios interceptor
    const handleAuthExpired = () => {
      queryClient.clear();
      setToken(null);
      setUser(null);
      setOnboardingRequired(false);
      localStorage.removeItem(STORAGE_KEYS.USER_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    };

    // Listen for successful silent refreshes on the same tab (fired by Axios interceptor)
    // to keep React context in sync with the new access token.
    const handleAuthRefreshed = () => {
      const newToken = localStorage.getItem(STORAGE_KEYS.USER_TOKEN);
      const storedUser = localStorage.getItem(STORAGE_KEYS.USER_DATA);
      if (newToken) {
        setToken(newToken);
      }
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          // Ignore malformed stored user data
        }
      }
    };

    window.addEventListener('auth:expired', handleAuthExpired);
    window.addEventListener('auth:refreshed', handleAuthRefreshed);
    return () => {
      window.removeEventListener('auth:expired', handleAuthExpired);
      window.removeEventListener('auth:refreshed', handleAuthRefreshed);
    };
  }, [queryClient]);

  const login = useCallback((newToken: string, newUser: AuthUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem(STORAGE_KEYS.USER_TOKEN, newToken);
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(newUser));
  }, []);

  const logout = useCallback(async () => {
    try {
      await publicLogout();
    } catch {
      // Ignore API failures during logout
    } finally {
      queryClient.clear();
      setToken(null);
      setUser(null);
      setOnboardingRequired(false);
      localStorage.removeItem(STORAGE_KEYS.USER_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    }
  }, [queryClient]);


  const contextValue = useMemo(() => ({
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    onboardingRequired,
    setOnboardingRequired,
    login,
    logout,
  }), [user, token, isLoading, onboardingRequired, setOnboardingRequired, login, logout]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
