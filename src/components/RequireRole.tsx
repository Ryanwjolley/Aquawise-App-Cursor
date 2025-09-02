"use client";

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

type Allowed = 'admin' | 'manager' | 'super_admin' | 'super';

export function RequireRole({ allowed, children }: { allowed: Allowed[]; children: ReactNode }) {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const role = (currentUser?.role || '').toLowerCase();
    const isAdmin = role.includes('admin');
    const isManager = role.includes('manager');
    const isSuper = role.includes('super');

    const ok = (
      (isSuper && (allowed.includes('super_admin') || allowed.includes('super'))) ||
      (isAdmin && allowed.includes('admin')) ||
      (isManager && allowed.includes('manager'))
    );
    if (!ok) router.replace('/');
  }, [currentUser, loading, allowed, router]);

  if (loading) return null;
  const role = (currentUser?.role || '').toLowerCase();
  const isAdmin = role.includes('admin');
  const isManager = role.includes('manager');
  const isSuper = role.includes('super');
  const ok = (
    (isSuper && (allowed.includes('super_admin') || allowed.includes('super'))) ||
    (isAdmin && allowed.includes('admin')) ||
    (isManager && allowed.includes('manager'))
  );
  if (!ok) return null;
  return <>{children}</>;
}




