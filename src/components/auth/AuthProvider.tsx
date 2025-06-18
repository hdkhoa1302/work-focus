import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../../services/api';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  resetPassword: (email: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      try {
        // Check both localStorage and sessionStorage for token
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (token) {
          try {
            const { data: userData } = await api.get<User>('/api/auth/validate');
            setUser(userData);
            window.ipc?.send('user-logged-in', { userId: userData.id });
          } catch (err) {
            console.error('Session validation failed:', err);
            // Clear invalid tokens from both storages
            localStorage.removeItem('authToken');
            sessionStorage.removeItem('authToken');
          }
        }
      } catch (err) {
        console.error('Error checking session:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = async (email: string, password: string, remember = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await api.post<{ message: string; user: User; token: string }>('/api/auth/login', { email, password });
      const { user: userData, token } = data;
      
      // Save token based on remember preference
      if (remember) {
        localStorage.setItem('authToken', token);
        // Remove from sessionStorage if exists
        sessionStorage.removeItem('authToken');
      } else {
        sessionStorage.setItem('authToken', token);
        // Remove from localStorage if exists
        localStorage.removeItem('authToken');
      }
      
      setUser(userData);
      window.ipc?.send('user-logged-in', { userId: userData.id });
      
      // Chuyển URL về root để vào Dashboard
      if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
        window.history.replaceState({}, '', '/');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await api.post<{ message: string; user: User; token: string }>('/api/auth/register', { email, password, name });
      
      // For registration, always save to localStorage (remember by default)
      localStorage.setItem('authToken', data.token);
      sessionStorage.removeItem('authToken');
      
      setUser(data.user);
      window.ipc?.send('user-logged-in', { userId: data.user.id });
      
      // Chuyển URL về root để vào Dashboard
      if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
        window.history.replaceState({}, '', '/');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Registration failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    // Clear tokens from both storages
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    setUser(null);
    setError(null);
  };

  const resetPassword = async (email: string) => {
    setError(null);
    try {
      await api.post('/api/auth/reset-password', { email });
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Password reset failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const value = {
    user,
    login,
    register,
    logout,
    resetPassword,
    isLoading,
    error
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};