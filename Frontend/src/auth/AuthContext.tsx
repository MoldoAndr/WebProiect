import React, { createContext, useContext, useState } from 'react';
import { login as loginService, signup as signupService } from './authService';

type Role = 'User' | 'Technician' | 'Administrator';

interface User {
  id: string;
  name: string;
  role: Role;
  token?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, role: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  async function login(email: string, password: string) {
    // This calls your backend login API
    const { user: userData, token } = await loginService(email, password);
    setUser({ ...userData, token });
    
    // Store the token in localStorage (optional but common)
    localStorage.setItem('authToken', token);
  }

  async function signup(name: string, email: string, password: string) {
    // This calls your backend signup API
    const { user: userData, token } = await signupService(name, email, password);
    setUser({ ...userData, token });
    
    localStorage.setItem('authToken', token);
  }

  function logout() {
    setUser(null);
    localStorage.removeItem('authToken');
  }

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
