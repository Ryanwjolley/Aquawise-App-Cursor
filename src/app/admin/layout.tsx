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
    // This effect handles redirection after the loading state is resolved.
    if (!loading) {
      if (!user) {
        // If loading is done and there's no user, redirect to login.
        router.push('/login');
      } else if (userDetails && userDetails.role !== 'admin') {
        // If loading is done, user details are available, but user is not an admin, redirect.
        router.push('/dashboard');
      }
    }
  }, [user, userDetails, loading, router]);

  // The primary loading state. It covers both the initial auth check
  // and the subsequent fetching of user details from Firestore.
  // We also keep loading if the user is logged in but we haven't fetched their details yet.
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

  // If all checks have passed (loading is done, user exists, and is an admin), render the content.
  if (user && userDetails && userDetails.role === 'admin') {
    return <AppLayout>{children}</AppLayout>;
  }

  // In the brief moment before redirection happens for non-admins,
  // or if the user is logged out and about to be redirected,
  // return null to prevent any flickering of content.
  return null;
}
