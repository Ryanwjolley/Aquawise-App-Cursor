'use client';
import AppLayout from '@/components/app-layout';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // NOTE: This layout is temporarily unsecured to allow for credential creation.
  return <AppLayout>{children}</AppLayout>;
}
