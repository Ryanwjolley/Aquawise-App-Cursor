
'use client';
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { app, db } from '@/firebaseConfig';
import type { User, Company } from '@/firestoreService';
import { useRouter } from 'next/navigation';
import { getCompanies } from '@/firestoreService';

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
  startImpersonation: (companyId: string) => void;
  stopImpersonation: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// MOCK DATA for development without real authentication
const MOCK_COMPANY_ID = 'manti-irrigation-co';
const MOCK_COMPANIES: Company[] = [
    { id: 'manti-irrigation-co', name: 'Manti Irrigation Company' },
    { id: 'another-co-id', name: 'Another Irrigation Co' },
];
const MOCK_ADMIN_USER: User = {
  id: 'admin-001',
  companyId: MOCK_COMPANY_ID,
  name: 'Water Master Admin',
  email: 'admin@aquawise.com',
  role: 'admin',
  shares: 0,
  status: 'active',
};
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
  const [companies, setCompanies] = useState<Company[]>(MOCK_COMPANIES);
  const [companyDetails, setCompanyDetails] = useState<Company | null>(null);
  const [loading, setLoading] = useState(false);
  const auth = getAuth(app);
  const router = useRouter();

  const [impersonatingCompanyId, setImpersonatingCompanyId] = useState<string | null>(null);
  const [impersonatedCompanyDetails, setImpersonatedCompanyDetails] = useState<Company | null>(null);

  const fetchCompanies = useCallback(async () => {
    // In a real app, this would fetch from Firestore.
    // For now, we use the mock data.
    // const fetchedCompanies = await getCompanies();
    // setCompanies(fetchedCompanies);
  }, []);
  
  // Initial fetch
  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

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
  
  const startImpersonation = (companyId: string) => {
    if (userDetails?.companyId === 'system-admin') {
      setImpersonatingCompanyId(companyId);
    }
  };

  const stopImpersonation = () => {
    setImpersonatingCompanyId(null);
  };

  const refreshCompanies = async () => {
      await fetchCompanies();
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
        stopImpersonation
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
