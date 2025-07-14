'use client';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Droplets } from 'lucide-react';
import AppLayout from '@/components/app-layout';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, userDetails, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return; // Do nothing while loading
    }
    if (!user) {
      router.replace('/login');
      return;
    }
    if (userDetails && userDetails.role !== 'admin') {
      router.replace('/dashboard');
    }
  }, [user, userDetails, loading, router]);


  // While loading, or if the user is not yet verified as an admin, show a loading screen.
  if (loading || !userDetails || userDetails.role !== 'admin') {
    return (
       <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
            <Droplets className="h-12 w-12 text-primary animate-pulse" />
            <p className="text-muted-foreground">Verifying Admin Credentials...</p>
        </div>
      </div>
    );
  }

  // Once all checks pass, render the layout with the children.
  return <AppLayout>{children}</AppLayout>;
}
