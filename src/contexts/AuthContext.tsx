
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
  reloadCompany: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const impersonationStorageKey = 'impersonation_admin_id';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);

  const defaultUserId = '100'; // Ryan Jolley (Super Admin)

  useEffect(() => {
    const handleUserUpdate = (event: Event) => {
        const customEvent = event as CustomEvent;
        const updatedUser = customEvent.detail as User;
        if (currentUser && updatedUser.id === currentUser.id) {
            setCurrentUser(updatedUser);
        }
    };
    
     const handleCompanyUpdate = (event: Event) => {
        const customEvent = event as CustomEvent;
        const updatedCompany = customEvent.detail as Company;
        if (company && updatedCompany.id === company.id) {
            setCompany(updatedCompany);
        }
    };


    window.addEventListener('user-updated', handleUserUpdate);
    window.addEventListener('company-updated', handleCompanyUpdate);
    return () => {
        window.removeEventListener('user-updated', handleUserUpdate);
        window.removeEventListener('company-updated', handleCompanyUpdate);
    };
  }, [currentUser, company]);

  useEffect(() => {
    const adminId = sessionStorage.getItem(impersonationStorageKey);
    const userIdToLoad = sessionStorage.getItem('impersonation_user_id') || defaultUserId;
    
    if (adminId) {
        setIsImpersonating(true);
    }
    
    loadUser(userIdToLoad);
  }, []);

  const loadUser = async (userId: string, redirect: boolean = false) => {
    setLoading(true);
    const user = await getUserById(userId);
    if (user) {
      setCurrentUser(user);
      await loadCompany(user.companyId);
       if (redirect) {
        // We need to check if we are currently impersonating *before* determining the redirect path.
        const stillImpersonating = !!sessionStorage.getItem(impersonationStorageKey);
        
        let targetPath = '/';
        if (user.role === 'Super Admin' && !stillImpersonating) {
            targetPath = '/super-admin';
        } else if (user.role?.includes('Admin') && !stillImpersonating) {
            targetPath = '/admin';
        } else if (user.role?.includes('Admin') && stillImpersonating) {
            targetPath = '/admin';
        }
        router.push(targetPath);
      }
    } else {
      setCurrentUser(null);
      setCompany(null);
    }
    setLoading(false);
  }
  
  const loadCompany = async (companyId: string) => {
      const userCompany = await getCompanyById(companyId);
      setCompany(userCompany || null);
  }
  
  const reloadCompany = async () => {
    if(currentUser?.companyId) {
        await loadCompany(currentUser.companyId);
    }
  }

  const impersonateUser = async (userId: string) => {
    if (currentUser && !sessionStorage.getItem(impersonationStorageKey)) {
        sessionStorage.setItem(impersonationStorageKey, currentUser.id);
        sessionStorage.setItem('impersonation_user_id', userId);
    }
    setIsImpersonating(true);
    await loadUser(userId, true);
  };

  const stopImpersonating = async () => {
    const adminId = sessionStorage.getItem(impersonationStorageKey);
    if (adminId) {
        sessionStorage.removeItem(impersonationStorageKey);
        sessionStorage.removeItem('impersonation_user_id');
        setIsImpersonating(false);
        await loadUser(adminId, true);
    }
  }

  const value = { currentUser, company, impersonateUser, loading, isImpersonating, stopImpersonating, reloadCompany };

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
