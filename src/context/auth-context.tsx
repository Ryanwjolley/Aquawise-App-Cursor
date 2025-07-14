'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { app, db } from '@/firebaseConfig';
import type { User } from '@/firestoreService';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: FirebaseUser | null;
  userDetails: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MOCK_ADMIN_USER = {
  id: 'admin-001',
  name: 'Admin User',
  email: 'admin@aquawise.com',
  role: 'admin',
  shares: 100,
  status: 'active',
} as User;

const MOCK_FIREBASE_USER = {
    uid: 'admin-001',
    email: 'admin@aquawise.com',
} as FirebaseUser;


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(MOCK_FIREBASE_USER);
  const [userDetails, setUserDetails] = useState<User | null>(MOCK_ADMIN_USER);
  const [loading, setLoading] = useState(false); // Set to false since we are using mock data
  const auth = getAuth(app);
  const router = useRouter();

  // The original onAuthStateChanged is commented out to allow for mock user.
  // We can restore this when we re-enable login.
  /*
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = { id: userDoc.id, ...userDoc.data() } as User;
            setUser(firebaseUser);
            setUserDetails(userData);
          } else {
            // No user document, sign out
            await auth.signOut();
            setUser(null);
            setUserDetails(null);
          }
        } catch (error) {
          console.error("Error fetching user details:", error);
          await auth.signOut();
          setUser(null);
          setUserDetails(null);
        } finally {
          setLoading(false);
        }
      } else {
        // No user is logged in
        setUser(null);
        setUserDetails(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [auth]);
  */

  const logout = async () => {
    // When using mock data, this just clears the state.
    // In a real scenario, it would sign out from Firebase.
    setUser(null);
    setUserDetails(null);
    // Redirect to the root, which will then go to the admin page.
    router.push('/');
  };


  return (
    <AuthContext.Provider value={{ user, userDetails, loading, logout }}>
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
