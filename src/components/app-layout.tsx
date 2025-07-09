'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { LogOut, LayoutDashboard, Users, Droplets } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { userDetails, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name.substring(0, 2);
  };

  const isAdmin = userDetails?.role === 'admin';

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
            <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Droplets className="size-6" />
                </div>
                <span className="text-xl font-semibold">AquaWise</span>
            </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {isAdmin ? (
              <>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => router.push('/admin')}
                    isActive={pathname === '/admin'}
                    tooltip="Admin Dashboard"
                  >
                    <LayoutDashboard />
                    Admin Dashboard
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => router.push('/dashboard')}
                    isActive={pathname === '/dashboard'}
                    tooltip="Customer View"
                  >
                    <Users />
                    Customer View
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            ) : (
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => router.push('/dashboard')}
                  isActive={pathname === '/dashboard'}
                  tooltip="My Dashboard"
                >
                  <LayoutDashboard />
                  My Dashboard
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
            <div className="flex items-center gap-3">
                <Avatar className="size-8">
                    <AvatarImage data-ai-hint="profile picture" src={`https://placehold.co/40x40.png`} alt={userDetails?.name || 'User'} />
                    <AvatarFallback>{getInitials(userDetails?.name || '')}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col text-sm overflow-hidden">
                    <span className="font-semibold text-foreground truncate">{userDetails?.name}</span>
                    <span className="text-muted-foreground truncate">{userDetails?.email}</span>
                </div>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="ml-auto flex-shrink-0" onClick={logout}>
                                <LogOut />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Logout</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-12 items-center border-b bg-background px-4 md:hidden">
            <SidebarTrigger />
        </header>
        <main className="flex-1 overflow-auto bg-muted/30">
            {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
