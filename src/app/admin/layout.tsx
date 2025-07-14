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
    // Wait until the initial loading is complete before doing any checks.
    if (!loading) {
      if (!user) {
        // If there's no user, redirect to login.
        router.push('/login');
      } else if (userDetails && userDetails.role !== 'admin') {
        // If user details are loaded and the user is not an admin, redirect.
        router.push('/dashboard');
      }
    }
  }, [user, userDetails, loading, router]);

  // This is the primary loading state. It covers both the initial auth check
  // and the subsequent fetching of user details from Firestore.
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

  // If all checks have passed (loading is done, user exists, and is an admin), render the content.
  // The useEffect handles redirection for non-admins, so we only need to check for the admin role here.
  if (userDetails.role === 'admin') {
    return <AppLayout>{children}</AppLayout>;
  }

  // In the brief moment before redirection happens for non-admins,
  // return null to prevent any flickering of content.
  return null;
}
