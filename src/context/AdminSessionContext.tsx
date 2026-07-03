import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  type AdminPermission,
  type AdminSessionPayload,
  type AdminUser,
  AdminApiError,
  getCurrentAdminSession,
  loginAdmin,
  logoutAdmin,
} from '../lib/adminAuthApi';

type AdminSessionContextValue = {
  authenticated: boolean;
  loading: boolean;
  login: (email: string, password: string, otp?: string) => Promise<AdminSessionPayload>;
  logout: () => Promise<void>;
  permissions: AdminPermission[];
  refresh: () => Promise<void>;
  user: AdminUser | null;
};

const AdminSessionContext = createContext<AdminSessionContextValue | null>(null);

const EMPTY_ADMIN_SESSION: AdminSessionPayload = {
  authenticated: false,
  permissions: [],
  user: null,
};

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AdminSessionPayload>(EMPTY_ADMIN_SESSION);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const payload = await getCurrentAdminSession();
      setSession(payload);
    } catch {
      setSession(EMPTY_ADMIN_SESSION);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const handleFocus = () => {
      void refresh();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refresh]);

  const login = useCallback(async (email: string, password: string, otp?: string) => {
    const payload = await loginAdmin(email, password, otp);
    setSession(payload);
    return payload;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutAdmin();
    } finally {
      setSession(EMPTY_ADMIN_SESSION);
    }
  }, []);

  const value = useMemo<AdminSessionContextValue>(() => ({
    authenticated: session.authenticated,
    loading,
    login,
    logout,
    permissions: session.permissions,
    refresh,
    user: session.user,
  }), [loading, login, logout, refresh, session]);

  return (
    <AdminSessionContext.Provider value={value}>
      {children}
    </AdminSessionContext.Provider>
  );
}

export function useAdminSession() {
  const value = useContext(AdminSessionContext);
  if (!value) {
    throw new Error('useAdminSession must be used within AdminSessionProvider');
  }
  return value;
}

export function isAdminApiErrorWithCode(error: unknown, code: string) {
  return error instanceof AdminApiError && error.code === code;
}

