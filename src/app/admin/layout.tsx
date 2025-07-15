
'use client';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import AppLayout from '@/components/app-layout';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, userDetails, loading, impersonatingCompanyId } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      const isSuperAdminImpersonating = userDetails?.companyId === 'system-admin' && !!impersonatingCompanyId;
      const isRegularAdmin = userDetails?.role === 'admin' && userDetails?.companyId !== 'system-admin';

      if (!user || !userDetails || (!isRegularAdmin && !isSuperAdminImpersonating)) {
         router.replace('/dashboard');
      }
    }
  }, [user, userDetails, loading, router, impersonatingCompanyId]);


  if (loading || !userDetails) {
      return null; // Or a loading spinner
  }

  return <AppLayout>{children}</AppLayout>;
}
