"use client";

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import type { User, Company } from '@/lib/data';
import { useRouter, usePathname } from 'next/navigation';
import { auth } from '@/firebaseConfig';
import { GoogleAuthProvider, onAuthStateChanged, signOut, signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { fetchCompany, fetchUserProfile } from '@/lib/firestoreData';
import { normalizeRole, canImpersonate } from '@/lib/roles';

interface AuthContextValue {
  currentUser: User | null;
  company: Company | null;
  loading: boolean;
  isImpersonating: boolean;
  logout: () => Promise<void>;
  googleSignIn: () => Promise<void>;
  reloadCompany: () => Promise<void>;
  impersonateUser: (userId: string, companyId?: string) => Promise<void>;
  stopImpersonating: () => Promise<void>;
  switchUser: (userId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AuthHandler = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonationRecordId, setImpersonationRecordId] = useState<string | null>(null);
  const [originalUser, setOriginalUser] = useState<User | null>(null);
  const [originalCompany, setOriginalCompany] = useState<Company | null>(null);

  const lastSentTokenRef = useRef<string | null>(null);

  async function ensureSessionCookie(fbUser: any) {
    try {
      if (!fbUser) return;
      const token = await fbUser.getIdToken();
      if (token && token !== lastSentTokenRef.current) {
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: token }),
        });
        lastSentTokenRef.current = token;
      }
    } catch {}
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true);
      if (!fbUser) {
        setCurrentUser(null);
        setCompany(null);
        setLoading(false);
        if (pathname !== '/login') router.replace('/login');
        return;
      }

      // Ensure backend session cookie present (for middleware / server guards)
      await ensureSessionCookie(fbUser);

      // If currently impersonating, do not override the client-side identity
      if (isImpersonating && currentUser && company) {
        setLoading(false);
        return;
      }

      // Super admin belongs to AquaWise company with canonical id '0'
      const companyId = '0';
      const profile = await fetchUserProfile(companyId, fbUser.uid);

      if (profile) {
        setCurrentUser(profile);
        const companyDoc = await fetchCompany(companyId);
        setCompany(companyDoc);
        // Redirect based on role
        const role = (profile.role || '').toLowerCase();
        if (pathname === '/login') {
          if (role.includes('super')) router.replace('/super-admin');
          else if (role.includes('admin') || role.includes('manager')) router.replace('/admin');
          else router.replace('/');
        }
      } else {
        // No profile; keep minimal identity
        setCurrentUser({ id: fbUser.uid, name: fbUser.email || 'User', email: fbUser.email || '', role: 'Customer', companyId: companyId } as unknown as User);
        const companyDoc = await fetchCompany(companyId);
        setCompany(companyDoc);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [router, pathname]);

  const logout = async () => {
    try { await fetch('/api/auth/session', { method: 'DELETE' }); } catch {}
    await signOut(auth);
    router.replace('/login');
  };

  const googleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/popup-blocked') {
        await signInWithRedirect(auth, provider);
      } else {
        throw err;
      }
    }
  };

  const reloadCompany = async () => {
    if (currentUser?.companyId) {
      const c = await fetchCompany(currentUser.companyId);
      setCompany(c);
    }
  };

  const impersonateUser = async (targetUserId: string, targetCompanyId?: string) => {
    if (!currentUser) return;
    const actorRole = normalizeRole(currentUser.role);
    const companyIdToUse = targetCompanyId || currentUser.companyId;
    if (!companyIdToUse) return;
    const targetProfile = await fetchUserProfile(companyIdToUse, targetUserId);
    const targetCompany = await fetchCompany(companyIdToUse);
    if (!targetProfile || !targetCompany) return;
    if (!canImpersonate(actorRole, targetProfile.role)) return; // silently ignore if forbidden
    setOriginalUser(currentUser);
    setOriginalCompany(company);
    setCurrentUser(targetProfile);
    setCompany(targetCompany);
    setIsImpersonating(true);
    // Fire audit API (best-effort; failure should not block UX)
    try {
      const resp = await fetch('/api/impersonation/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: companyIdToUse,
          actorUserId: currentUser.id,
          targetUserId,
          actorRole: actorRole,
          targetRole: targetProfile.role,
        }),
      });
      if (resp.ok) {
        const json = await resp.json();
        if (json.id) setImpersonationRecordId(json.id);
      }
    } catch {}
    router.replace(actorRole === 'super_admin' ? '/super-admin' : '/admin');
  };

  const stopImpersonating = async () => {
    if (originalUser && originalCompany) {
      setCurrentUser(originalUser);
      setCompany(originalCompany);
    }
    // Close audit record
    if (impersonationRecordId) {
      try {
        await fetch('/api/impersonation/end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ companyId: originalUser?.companyId, recordId: impersonationRecordId }),
        });
      } catch {}
    }
    setOriginalUser(null);
    setOriginalCompany(null);
  setIsImpersonating(false);
    const role = normalizeRole(originalUser?.role);
    if (role === 'super_admin') router.replace('/super-admin');
    else if (role === 'admin' || role === 'manager') router.replace('/admin');
    else router.replace('/');
  };

  const switchUser = async (_userId: string) => {
    // Not supported in production; keep for API compatibility
    return;
  };

  const value = { currentUser, company, loading, isImpersonating, logout, googleSignIn, reloadCompany, impersonateUser, stopImpersonating, switchUser };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  return <AuthHandler>{children}</AuthHandler>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
