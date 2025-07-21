"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User, Company } from '@/lib/data';
import { getUserById, getCompanyById } from '@/lib/data';

interface AuthContextValue {
  currentUser: User | null;
  company: Company | null;
  impersonateUser: (userId: string) => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  // Default to a specific user on initial load for development purposes
  // In a real app, this would be handled by a login flow.
  const defaultUserId = '101'; // Alice Johnson (Admin)

  useEffect(() => {
    impersonateUser(defaultUserId);
  }, []);

  const impersonateUser = async (userId: string) => {
    setLoading(true);
    const user = await getUserById(userId);
    if (user) {
      setCurrentUser(user);
      const userCompany = await getCompanyById(user.companyId);
      setCompany(userCompany || null);
    } else {
      setCurrentUser(null);
      setCompany(null);
    }
    setLoading(false);
  };

  const value = { currentUser, company, impersonateUser, loading };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
