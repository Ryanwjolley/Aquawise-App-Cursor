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
        router.push('/dashboard'); // or a '/unauthorized' page
      }
    }
  }, [user, userDetails, loading, router]);

  if (loading || !userDetails || userDetails.role !== 'admin') {
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

  return <AppLayout>{children}</AppLayout>;
}
