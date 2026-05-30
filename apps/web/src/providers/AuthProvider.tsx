'use client';

import { publicGetMe, publicLogout } from '@/lib/api/public.service';
import { STORAGE_KEYS } from '@mad/shared';
import { useQueryClient } from '@tanstack/react-query';
import { AuthUser } from '../types/auth';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';


interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  login: () => {},
  logout: () => {},
});


function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;

    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
    const jsonPayload = decodeURIComponent(
      window.atob(padded)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const decoded = JSON.parse(jsonPayload);
    if (typeof decoded.exp !== 'number') return false;

    return decoded.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate session and execute silent background refresh validation on mount
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const storedToken = localStorage.getItem(STORAGE_KEYS.USER_TOKEN);
        if (storedToken) {
          if (isTokenExpired(storedToken)) {
            // Attempt to trigger silent refresh via axios interceptor
            const userData = await publicGetMe();
            const newToken = localStorage.getItem(STORAGE_KEYS.USER_TOKEN);
            setToken(newToken);
            setUser(userData);
            localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
          } else {
            setToken(storedToken);
            const storedUser = localStorage.getItem(STORAGE_KEYS.USER_DATA);
            if (storedUser) setUser(JSON.parse(storedUser));
            
            // Re-validate profile in background
            const userData = await publicGetMe();
            setUser(userData);
            localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
          }
        } else {
          // No short-lived access token, check if HttpOnly refresh token cookie exists
          const userData = await publicGetMe();
          const newToken = localStorage.getItem(STORAGE_KEYS.USER_TOKEN);
          if (newToken) {
            setToken(newToken);
            setUser(userData);
            localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
          }
        }
      } catch (err) {
        // Clear stale local sessions if unauthenticated
        setToken(null);
        setUser(null);
        localStorage.removeItem(STORAGE_KEYS.USER_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER_DATA);
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
      localStorage.removeItem(STORAGE_KEYS.USER_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    };

    window.addEventListener('auth:expired', handleAuthExpired);
    return () => {
      window.removeEventListener('auth:expired', handleAuthExpired);
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
      localStorage.removeItem(STORAGE_KEYS.USER_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    }
  }, [queryClient]);


  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
