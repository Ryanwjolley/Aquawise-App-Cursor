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
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (userDetails && userDetails.role !== 'admin') {
        router.push('/dashboard');
      }
    }
  }, [user, userDetails, loading, router]);

  // Show loading screen while auth state is resolving OR if user is logged in but details haven't been fetched yet.
  if (loading || (user && !userDetails)) {
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

  // If loading is finished, user is not logged in, or user is not an admin, don't render children.
  // The useEffect above will handle the redirection. Return null to prevent flicker.
  if (!user || (userDetails && userDetails.role !== 'admin')) {
    return null;
  }
  
  // If all checks pass, render the layout with children.
  return <AppLayout>{children}</AppLayout>;
}
