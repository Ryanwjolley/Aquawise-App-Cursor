'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { app, db } from '@/firebaseConfig';
import type { User, Company } from '@/firestoreService';
import { useRouter } from 'next/navigation';
import { getCompanies } from '@/firestoreService';

interface AuthContextType {
  user: FirebaseUser | null;
  userDetails: User | null;
  companies: Company[];
  loading: boolean;
  logout: () => Promise<void>;
  refreshCompanies: () => Promise<void>;
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
  companyId: 'system-admin', // Special ID for a system-level admin
  name: 'System Admin',
  email: 'admin@aquawise.com',
  role: 'admin',
  shares: 0,
  status: 'active',
};
const MOCK_FIREBASE_USER = {
    uid: 'admin-001',
    email: 'admin@aquawise.com',
} as FirebaseUser;


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(MOCK_FIREBASE_USER);
  const [userDetails, setUserDetails] = useState<User | null>(MOCK_ADMIN_USER);
  const [companies, setCompanies] = useState<Company[]>(MOCK_COMPANIES);
  const [loading, setLoading] = useState(false);
  const auth = getAuth(app);
  const router = useRouter();

  const fetchCompanies = async () => {
    // In a real app, this would fetch from Firestore.
    // For now, we use the mock data.
    // const fetchedCompanies = await getCompanies();
    // setCompanies(fetchedCompanies);
  };
  
  // Initial fetch
  useEffect(() => {
    // fetchCompanies();
  }, []);

  const logout = async () => {
    setUser(null);
    setUserDetails(null);
    router.push('/');
  };

  const refreshCompanies = async () => {
      // This function can be called after adding a new company to update the list.
      // await fetchCompanies();
  }


  return (
    <AuthContext.Provider value={{ user, userDetails, loading, logout, companies, refreshCompanies }}>
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
