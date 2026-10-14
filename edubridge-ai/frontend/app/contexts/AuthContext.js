'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, getToken, setToken, removeToken } from '@/app/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    try {
      const me = await authAPI.getMe();
      setUser(me);
    } catch {
      removeToken();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = async (email, password) => {
    const data = await authAPI.login({ email, password });
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  const register = async (name, email, password, role, preferred_language) => {
    const data = await authAPI.register({ name, email, password, role, preferred_language });
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    removeToken();
    setUser(null);
  };

  const updateLanguage = async (lang) => {
    await authAPI.updateLanguage(lang);
    setUser(u => ({ ...u, preferred_language: lang }));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateLanguage }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
