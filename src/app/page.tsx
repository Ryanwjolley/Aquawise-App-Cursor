'use client';

import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Droplets } from 'lucide-react';

export default function HomePage() {
  const { user, userDetails, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/login');
      } else if (userDetails?.role === 'admin') {
        router.replace('/admin');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [user, userDetails, loading, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
            <Droplets className="h-12 w-12 text-primary animate-pulse" />
            <p className="text-muted-foreground">Loading AquaWise...</p>
        </div>
    </div>
  );
}
