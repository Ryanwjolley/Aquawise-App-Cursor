'use client';

import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Droplets } from 'lucide-react';

export default function HomePage() {
  const { user, userDetails, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // We only want to act when the loading is fully complete.
    if (loading) {
      return;
    }

    // After loading, if a user and their details are present, route them.
    if (user && userDetails) {
      if (userDetails.role === 'admin') {
        router.replace('/admin');
      } else {
        router.replace('/dashboard');
      }
    } else {
      // If loading is done and there's no user, they must log in.
      router.replace('/login');
    }
  }, [user, userDetails, loading, router]);

  // Render a loading indicator until the routing logic in useEffect completes.
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Droplets className="h-12 w-12 text-primary animate-pulse" />
        <p className="text-muted-foreground">Loading AquaWise...</p>
      </div>
    </div>
  );
}
