'use client';

import { STORAGE_KEYS } from '@mad/shared';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';

import { adminGetMe, adminLogout as apiLogout, AdminUser } from '@/lib/api/admin/auth.service';

interface AdminAuthContextValue {
  admin: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (token: string, admin: AdminUser) => void;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue>({
  admin: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  setAuth: () => {},
  logout: async () => {},
});


export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate from localStorage and validate token on mount
  useEffect(() => {
    const hydrate = async () => {
      try {
        const storedToken = localStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN);
        if (!storedToken) {
          setIsLoading(false);
          return;
        }

        setToken(storedToken);

        // Validate token by fetching current admin
        const currentAdmin = await adminGetMe();
        setAdmin(currentAdmin);
      } catch {
        // Token invalid/expired — clear it
        localStorage.removeItem(STORAGE_KEYS.ADMIN_TOKEN);
        setToken(null);
        setAdmin(null);
      } finally {
        setIsLoading(false);
      }
    };

    hydrate();
  }, []);

  const setAuth = useCallback((newToken: string, newAdmin: AdminUser) => {
    setToken(newToken);
    setAdmin(newAdmin);
    localStorage.setItem(STORAGE_KEYS.ADMIN_TOKEN, newToken);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // Ignore logout API errors — always clear locally
    } finally {
      setToken(null);
      setAdmin(null);
      localStorage.removeItem(STORAGE_KEYS.ADMIN_TOKEN);
    }
  }, []);

  return (
    <AdminAuthContext.Provider
      value={{
        admin,
        token,
        isAuthenticated: !!token && !!admin,
        isLoading,
        setAuth,
        logout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthContextValue {
  return useContext(AdminAuthContext);
}
