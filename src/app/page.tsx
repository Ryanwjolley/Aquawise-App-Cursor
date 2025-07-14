'use client';

import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Droplets } from 'lucide-react';

export default function HomePage() {
  const { loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect directly to the admin dashboard, bypassing login.
    router.replace('/admin');
  }, [router]);

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
