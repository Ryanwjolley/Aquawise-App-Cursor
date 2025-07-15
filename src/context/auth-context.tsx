
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
  startImpersonation: (companyId: string) => void;
  stopImpersonation: () => void;
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

  const [impersonatingCompanyId, setImpersonatingCompanyId] = useState<string | null>(null);
  const [impersonatedCompanyDetails, setImpersonatedCompanyDetails] = useState<Company | null>(null);

  const fetchCompaniesAndBootstrapAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedCompanies = await getCompanies();
      setCompanies(fetchedCompanies);

      // --- Data Bootstrap Logic ---
      // This ensures the two mock companies have an admin user.
      const mockCompanyConfigs = [
        { name: 'JDE Irrigation', adminEmail: 'admin@jde.com', adminName: 'JDE Admin' },
        { name: 'Aqua-Agri Inc.', adminEmail: 'admin@aqua-agri.com', adminName: 'Aqua-Agri Admin' }
      ];

      const allUsers = await getUsers('system-admin'); // Fetch all users to check against
      const existingEmails = new Set(allUsers.map(u => u.email));

      for (const config of mockCompanyConfigs) {
        const targetCompany = fetchedCompanies.find(c => c.name === config.name);
        if (targetCompany && !existingEmails.has(config.adminEmail)) {
          // Check if an admin for this company already exists by another email
          const companyUsers = allUsers.filter(u => u.companyId === targetCompany.id && u.role === 'admin');
          if (companyUsers.length === 0) {
            console.log(`Bootstrapping admin for ${config.name}...`);
            await createUserDocument(`mock-admin-${targetCompany.id}`, {
              companyId: targetCompany.id,
              name: config.adminName,
              email: config.adminEmail,
              shares: 0,
              role: 'admin',
            });
          }
        }
      }
      // --- End Bootstrap Logic ---
      
    } catch (error) {
      console.error("Error during initial data fetch and bootstrap:", error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Initial fetch
  useEffect(() => {
    fetchCompaniesAndBootstrapAdmins();
  }, [fetchCompaniesAndBootstrapAdmins]);

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
      await fetchCompaniesAndBootstrapAdmins();
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
