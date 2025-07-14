'use client';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Droplets } from 'lucide-react';
import AppLayout from '@/components/app-layout';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (!loading && user) {
    return <AppLayout>{children}</AppLayout>;
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
          <Droplets className="h-12 w-12 text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading Dashboard...</p>
      </div>
    </div>
  );
}
