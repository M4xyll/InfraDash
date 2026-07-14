'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { authApi, User } from '@/lib/api';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  completeSetup: (payload: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('infradash-token');
    if (!stored) {
      setLoading(false);
      return;
    }

    setToken(stored);
    authApi.me(stored)
      .then((response) => setUser(response.data))
      .catch(() => {
        localStorage.removeItem('infradash-token');
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const response = await authApi.login(email, password);
    setUser(response.data.user);
    setToken(response.data.token);
    localStorage.setItem('infradash-token', response.data.token);
  }

  async function completeSetup(payload: { name: string; email: string; password: string }) {
    const response = await authApi.initializeSetup(payload);
    setUser(response.data.user);
    setToken(response.data.token);
    localStorage.setItem('infradash-token', response.data.token);
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem('infradash-token');
  }

  const role = user?.role;
  const value: AuthContextValue = {
    user,
    token,
    loading,
    login,
    completeSetup,
    logout,
    canCreate: role === 'ADMIN' || role === 'OPERATOR',
    canUpdate: role === 'ADMIN' || role === 'OPERATOR',
    canDelete: role === 'ADMIN',
    isAdmin: role === 'ADMIN',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
