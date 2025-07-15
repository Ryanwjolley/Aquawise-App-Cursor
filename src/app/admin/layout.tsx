
'use client';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import AppLayout from '@/components/app-layout';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, userDetails, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // Redirect if not an admin or super admin, or if a super admin tries to access the regular admin page
      if (!user || !userDetails || userDetails.role !== 'admin') {
         router.replace('/dashboard'); // Or a login page in a real app
      }
      if(userDetails.companyId === 'system-admin') {
          router.replace('/superadmin');
      }
    }
  }, [user, userDetails, loading, router]);


  if (loading || !userDetails || userDetails.role !== 'admin' || userDetails.companyId === 'system-admin') {
      return null; // Or a loading spinner
  }

  return <AppLayout>{children}</AppLayout>;
}
