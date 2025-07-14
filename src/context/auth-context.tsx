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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userDetails, setUserDetails] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth(app);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        // User is logged in, now get their details
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setUser(firebaseUser);
            setUserDetails({ id: userDoc.id, ...userDoc.data() } as User);
          } else {
            // User authenticated but no user document. This is an invalid state.
            // Log them out.
            setUser(null);
            setUserDetails(null);
            await auth.signOut();
          }
        } catch (error) {
          console.error("Error fetching user details:", error);
          setUser(null);
          setUserDetails(null);
          await auth.signOut();
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

  const logout = async () => {
    await auth.signOut();
    // Reset state immediately and redirect
    setUser(null);
    setUserDetails(null);
    router.push('/login');
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
