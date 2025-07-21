
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User, Company } from '@/lib/data';
import { getUserById, getCompanyById } from '@/lib/data';
import { useRouter } from 'next/navigation';

interface AuthContextValue {
  currentUser: User | null;
  company: Company | null;
  impersonateUser: (userId: string) => Promise<void>;
  stopImpersonating: () => Promise<void>;
  isImpersonating: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const impersonationStorageKey = 'impersonation_admin_id';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);

  const defaultUserId = '101'; // Alice Johnson (Admin & Customer)

  useEffect(() => {
    // Check if we are currently impersonating on page load
    const adminId = sessionStorage.getItem(impersonationStorageKey);
    if (adminId) {
        setIsImpersonating(true);
    }
    // Load the current user (either default, or from a real auth session)
    loadUser(defaultUserId);
  }, []);

  const loadUser = async (userId: string, redirect: boolean = false) => {
    setLoading(true);
    const user = await getUserById(userId);
    if (user) {
      setCurrentUser(user);
      const userCompany = await getCompanyById(user.companyId);
      setCompany(userCompany || null);
       if (redirect) {
        // If the user is only an admin, redirect to admin page, otherwise to customer page.
        if (user.role === 'Admin') {
          router.push('/admin');
        } else {
          router.push('/');
        }
      }
    } else {
      setCurrentUser(null);
      setCompany(null);
    }
    setLoading(false);
  }

  const impersonateUser = async (userId: string) => {
    if (currentUser && !sessionStorage.getItem(impersonationStorageKey)) {
        sessionStorage.setItem(impersonationStorageKey, currentUser.id);
    }
    setIsImpersonating(true);
    await loadUser(userId, true);
  };

  const stopImpersonating = async () => {
    const adminId = sessionStorage.getItem(impersonationStorageKey);
    if (adminId) {
        sessionStorage.removeItem(impersonationStorageKey);
        setIsImpersonating(false);
        await loadUser(adminId, true);
    }
  }

  const value = { currentUser, company, impersonateUser, loading, isImpersonating, stopImpersonating };

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
