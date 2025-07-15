
'use client';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Droplets } from 'lucide-react';
import AppLayout from '@/components/app-layout';

function SuperAdminAuthGuard({ children }: { children: React.ReactNode }) {
  const { userDetails, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!userDetails || userDetails.companyId !== 'system-admin')) {
      router.replace('/dashboard');
    }
  }, [userDetails, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Droplets className="h-12 w-12 text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading Portal...</p>
        </div>
      </div>
    );
  }

  if (!userDetails || userDetails.companyId !== 'system-admin') {
      return (
          <div className="flex h-screen w-full items-center justify-center bg-background">
              <div className="flex flex-col items-center gap-4">
                  <Droplets className="h-12 w-12 text-primary animate-pulse" />
                  <p className="text-muted-foreground">Access Denied. Redirecting...</p>
              </div>
          </div>
      );
  }

  return <>{children}</>;
}


export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout>
        <SuperAdminAuthGuard>
            {children}
        </SuperAdminAuthGuard>
    </AppLayout>
  );
}
