'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';

interface User {
  id: string;
  email?: string;
  phone?: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithPhone: (phone: string, password: string) => Promise<boolean>;
  register: (email: string, phone: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [user, setUser] = useState<User | null>(null);

  // Sync Clerk user to local user state
  useEffect(() => {
    if (isLoaded && clerkUser) {
      const transformedUser: User = {
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress,
        phone: clerkUser.primaryPhoneNumber?.phoneNumber,
        name: clerkUser.fullName || clerkUser.username || 'User',
      };
      setUser(transformedUser);
    } else if (isLoaded && !clerkUser) {
      setUser(null);
    }
  }, [clerkUser, isLoaded]);

  // These methods are deprecated with Clerk, but kept for backward compatibility
  const login = async (email: string, password: string): Promise<boolean> => {
    console.warn('login() is deprecated. Use Clerk SignIn component instead.');
    return false;
  };

  const loginWithPhone = async (phone: string, password: string): Promise<boolean> => {
    console.warn('loginWithPhone() is deprecated. Use Clerk SignIn component instead.');
    return false;
  };

  const register = async (
    email: string,
    phone: string,
    password: string,
    name: string
  ): Promise<boolean> => {
    console.warn('register() is deprecated. Use Clerk SignUp component instead.');
    return false;
  };

  const logout = async () => {
    await signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!clerkUser,
        login,
        loginWithPhone,
        register,
        logout,
        isLoading: !isLoaded,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
