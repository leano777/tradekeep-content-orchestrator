'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import apiClient from '@/lib/api';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (emailOrUsername: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, username: string, firstName?: string, lastName?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('tk_auth_token');
      if (!token) {
        setLoading(false);
        return;
      }

      const data = await apiClient.getCurrentUser();
      setUser(data.user);
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('tk_auth_token');
      localStorage.removeItem('tk_refresh_token');
      localStorage.removeItem('tk_user');
    } finally {
      setLoading(false);
    }
  };

  const login = async (emailOrUsername: string, password: string) => {
    const credentials = emailOrUsername.includes('@')
      ? { email: emailOrUsername, password }
      : { username: emailOrUsername, password };
    
    const data = await apiClient.login(credentials);
    setUser(data.user);
  };

  const logout = async () => {
    await apiClient.logout();
    setUser(null);
  };

  const register = async (
    email: string, 
    password: string, 
    username: string,
    firstName?: string,
    lastName?: string
  ) => {
    const data = await apiClient.register({
      email,
      password,
      username,
      firstName,
      lastName
    });
    setUser(data.user);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Return a default context when not wrapped
    return {
      user: null,
      loading: false,
      login: async () => {},
      logout: async () => {},
      register: async () => {}
    };
  }
  return context;
}