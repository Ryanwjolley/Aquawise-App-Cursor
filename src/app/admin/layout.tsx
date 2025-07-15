
'use client';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import AppLayout from '@/components/app-layout';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, userDetails, loading, impersonatingCompanyId } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && userDetails) {
      const isSuperAdminImpersonating = userDetails.companyId === 'system-admin' && !!impersonatingCompanyId;
      const isRegularAdmin = userDetails.role === 'admin' && userDetails.companyId !== 'system-admin';

      // This is the main access control logic for the admin dashboard.
      // A user must be a regular admin OR a super admin who is currently impersonating.
      if (!isRegularAdmin && !isSuperAdminImpersonating) {
        // If the user is a super admin but NOT impersonating, send them to their own portal.
        if (userDetails.companyId === 'system-admin') {
          router.replace('/superadmin');
        } else {
          // Otherwise, send them to the customer dashboard.
          router.replace('/dashboard');
        }
      }
    }
  }, [user, userDetails, loading, router, impersonatingCompanyId]);


  if (loading || !userDetails) {
      return null; // Or a loading spinner
  }
  
  // This content will only be rendered if the guard passes.
  return <AppLayout>{children}</AppLayout>;
}
