
'use client';

import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Droplets } from 'lucide-react';

export default function HomePage() {
  const { userDetails, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && userDetails) {
        if (userDetails.companyId === 'system-admin') {
            router.replace('/superadmin');
        } else if (userDetails.role === 'admin') {
            router.replace('/admin');
        } else {
            router.replace('/dashboard');
        }
    }
    // If not logged in, a real app would redirect to /login.
    // For now, with mock data, we assume a user is always logged in.
    // If loading or no userDetails, the loading screen will show.
  }, [userDetails, loading, router]);

  // Render a loading indicator while the redirect happens.
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Droplets className="h-12 w-12 text-primary animate-pulse" />
        <p className="text-muted-foreground">Loading AquaWise...</p>
      </div>
    </div>
  );
}
