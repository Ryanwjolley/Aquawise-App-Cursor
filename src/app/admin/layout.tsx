'use client';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Droplets } from 'lucide-react';
import AppLayout from '@/components/app-layout';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, userDetails, loading } = useAuth();
  const router = useRouter();
  const [isVerifiedAdmin, setIsVerifiedAdmin] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (userDetails) {
        if (userDetails.role === 'admin') {
          setIsVerifiedAdmin(true);
        } else {
          router.push('/dashboard');
        }
      }
    }
  }, [user, userDetails, loading, router]);

  if (isVerifiedAdmin) {
    return <AppLayout>{children}</AppLayout>;
  }

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
