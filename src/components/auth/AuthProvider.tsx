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
        const token = localStorage.getItem('authToken');
        if (token) {
          try {
            const { data: userData } = await api.get<User>('/api/auth/validate');
            setUser(userData);
            window.ipc.send('user-logged-in', { userId: userData.id });
          } catch (err) {
            console.error('Session validation failed:', err);
            localStorage.removeItem('authToken');
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
      
      // Luôn lưu token vào localStorage để ghi nhớ đăng nhập
      localStorage.setItem('authToken', token);
      
      setUser(userData);
      window.ipc.send('user-logged-in', { userId: userData.id });
      // Chuyển URL về root để vào Dashboard
      if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
        window.history.replaceState({}, '', '/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await api.post<{ message: string; user: User; token: string }>('/api/auth/register', { email, password, name });
      localStorage.setItem('authToken', data.token);
      setUser(data.user);
      window.ipc.send('user-logged-in', { userId: data.user.id });
      // Chuyển URL về root để vào Dashboard
      if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
        window.history.replaceState({}, '', '/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    setError(null);
    try {
      await api.post('/api/auth/reset-password', { email });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed');
      throw err;
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