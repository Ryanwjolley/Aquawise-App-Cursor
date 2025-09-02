"use client";

import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { googleSignIn } = useAuth();
  return (
    <AppLayout>
      <div className="flex-1 p-6 md:p-10 flex items-center justify-center">
        <div className="w-full max-w-sm space-y-4">
          <h1 className="text-2xl font-semibold text-center">Sign in to Aquawise</h1>
          <Button className="w-full" onClick={googleSignIn}>Continue with Google</Button>
        </div>
      </div>
    </AppLayout>
  );
}



