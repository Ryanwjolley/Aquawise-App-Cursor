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

  const logout = async () => {
    await auth.signOut();
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
