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
    // If the initial auth check is done and there's no user, redirect.
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  // While loading, or if the user is present but details are still loading, show loading screen.
  if (loading || !userDetails) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center">
          <Droplets className="h-12 w-12 text-primary animate-pulse" />
          <p className="text-xl font-semibold">Loading Admin Dashboard...</p>
          <p className="text-muted-foreground">Verifying credentials.</p>
        </div>
      </div>
    );
  }

  // If loading is done, user is present, and they are not an admin, redirect.
  if (userDetails.role !== 'admin') {
     router.replace('/dashboard');
     return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4 text-center">
                <Droplets className="h-12 w-12 text-primary animate-pulse" />
                <p className="text-xl font-semibold">Redirecting...</p>
            </div>
        </div>
     );
  }

  // If all checks pass, render the admin content.
  return <AppLayout>{children}</AppLayout>;
}