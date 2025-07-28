
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
  logout: () => void;
  isImpersonating: boolean;
  loading: boolean;
  reloadCompany: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const impersonationAdminIdKey = 'impersonation_admin_id';
const impersonationAdminRoleKey = 'impersonation_admin_role';
const impersonationUserIdKey = 'impersonation_user_id';


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);

  const defaultUserId = '101'; // Alice Johnson (Admin & Customer for GVA)

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
    const adminId = sessionStorage.getItem(impersonationAdminIdKey);
    const userIdToLoad = sessionStorage.getItem(impersonationUserIdKey) || defaultUserId;
    
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
        const stillImpersonating = !!sessionStorage.getItem(impersonationAdminIdKey);
        
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
    if (currentUser && !sessionStorage.getItem(impersonationAdminIdKey)) {
        sessionStorage.setItem(impersonationAdminIdKey, currentUser.id);
        sessionStorage.setItem(impersonationAdminRoleKey, currentUser.role);
        sessionStorage.setItem(impersonationUserIdKey, userId);
    }
    setIsImpersonating(true);
    await loadUser(userId, true);
  };

  const stopImpersonating = async () => {
    const adminId = sessionStorage.getItem(impersonationAdminIdKey);
    if (adminId) {
        sessionStorage.removeItem(impersonationAdminIdKey);
        sessionStorage.removeItem(impersonationAdminRoleKey);
        sessionStorage.removeItem(impersonationUserIdKey);
        setIsImpersonating(false);
        await loadUser(adminId, true);
    }
  }
  
  const logout = () => {
      sessionStorage.clear();
      setIsImpersonating(false);
      loadUser(defaultUserId, true);
  }

  const value = { currentUser, company, impersonateUser, loading, isImpersonating, stopImpersonating, reloadCompany, logout };

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
