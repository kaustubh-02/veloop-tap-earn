import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi } from '../api/endpoints';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    const token = localStorage.getItem('veloop_access_token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { user: me } = await authApi.me();
      setUser(me);
    } catch {
      localStorage.removeItem('veloop_access_token');
      localStorage.removeItem('veloop_refresh_token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const login = useCallback(async (email, password) => {
    const data = await authApi.login({ email, password });
    localStorage.setItem('veloop_access_token', data.accessToken);
    localStorage.setItem('veloop_refresh_token', data.refreshToken);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (email, password, displayName) => {
    const data = await authApi.register({ email, password, displayName });
    localStorage.setItem('veloop_access_token', data.accessToken);
    localStorage.setItem('veloop_refresh_token', data.refreshToken);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('veloop_access_token');
    localStorage.removeItem('veloop_refresh_token');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
