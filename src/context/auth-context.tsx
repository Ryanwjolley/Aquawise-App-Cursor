
'use client';
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { app, db } from '@/firebaseConfig';
import type { User, Company } from '@/firestoreService';
import { useRouter } from 'next/navigation';
import { getCompanies, getUsers, createUserDocument } from '@/firestoreService';

interface AuthContextType {
  user: FirebaseUser | null;
  userDetails: User | null;
  companyDetails: Company | null;
  companies: Company[];
  loading: boolean;
  logout: () => Promise<void>;
  refreshCompanies: () => Promise<void>;
  impersonatingCompanyId: string | null;
  impersonatedCompanyDetails: Company | null;
  startImpersonation: (userToImpersonate: User) => void;
  stopImpersonation: () => void;
  impersonatingUser: User | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// MOCK DATA for development without real authentication
const MOCK_SUPER_ADMIN_USER: User = {
  id: 'super-admin-001',
  companyId: 'system-admin',
  name: 'Super Admin',
  email: 'super@aquawise.com',
  role: 'admin',
  shares: 0,
  status: 'active',
}

const MOCK_FIREBASE_USER = {
    uid: 'super-admin-001',
    email: 'super@aquawise.com',
} as FirebaseUser;


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(MOCK_FIREBASE_USER);
  const [userDetails, setUserDetails] = useState<User | null>(MOCK_SUPER_ADMIN_USER);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyDetails, setCompanyDetails] = useState<Company | null>(null);
  const [loading, setLoading] = useState(false);
  const auth = getAuth(app);
  const router = useRouter();

  const [impersonatingUser, setImpersonatingUser] = useState<User | null>(null);

  // Deprecated state, use impersonatingUser instead for full user object
  const [impersonatingCompanyId, setImpersonatingCompanyId] = useState<string | null>(null);
  const [impersonatedCompanyDetails, setImpersonatedCompanyDetails] = useState<Company | null>(null);

  const fetchAllCompanies = useCallback(async () => {
    try {
      const fetchedCompanies = await getCompanies();
      setCompanies(fetchedCompanies);
    } catch (error) {
      console.error("Error fetching initial company data:", error);
    }
  }, []);

  // Fetch companies initially
  useEffect(() => {
    fetchAllCompanies();
  }, [fetchAllCompanies]);

  useEffect(() => {
    const fetchCompanyDetails = async () => {
        if (userDetails && userDetails.companyId !== 'system-admin') {
            const details = companies.find(c => c.id === userDetails.companyId) || null;
            setCompanyDetails(details);
        } else {
            setCompanyDetails(null);
        }
    };
    fetchCompanyDetails();
  }, [userDetails, companies]);
  
  // This logic is for the superadmin impersonation, which is company-based
  useEffect(() => {
    const fetchImpersonatedCompanyDetails = () => {
      if (impersonatingCompanyId) {
        const details = companies.find(c => c.id === impersonatingCompanyId) || null;
        setImpersonatedCompanyDetails(details);
      } else {
        setImpersonatedCompanyDetails(null);
      }
    };
    fetchImpersonatedCompanyDetails();
  }, [impersonatingCompanyId, companies]);

  const logout = async () => {
    stopImpersonation();
    setUser(null);
    setUserDetails(null);
    setCompanyDetails(null);
    router.push('/');
  };
  
  const startImpersonation = (userToImpersonate: User) => {
    if (userDetails?.role === 'admin' || userDetails?.companyId === 'system-admin') {
      // Logic for regular admin impersonating a user
      setImpersonatingUser(userToImpersonate);

      // Logic for superadmin impersonating a company
      if (userDetails?.companyId === 'system-admin') {
          setImpersonatingCompanyId(userToImpersonate.companyId);
      }
    }
  };

  const stopImpersonation = () => {
    setImpersonatingUser(null);
    setImpersonatingCompanyId(null);
  };

  const refreshCompanies = async () => {
      await fetchAllCompanies();
  }


  return (
    <AuthContext.Provider value={{ 
        user, 
        userDetails, 
        loading, 
        logout, 
        companies, 
        companyDetails, 
        refreshCompanies,
        impersonatingCompanyId,
        impersonatedCompanyDetails,
        startImpersonation,
        stopImpersonation,
        impersonatingUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
