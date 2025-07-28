
// /src/components/AppLayout.tsx
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Home, Users, Settings, LogOut, Droplets, Building2, Upload, Target, XSquare, AreaChart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { UnitSwitcher } from "@/components/dashboard/UnitSwitcher";

function ImpersonationBanner() {
    const { stopImpersonating, currentUser } = useAuth();
    return (
        <div className="bg-accent text-accent-foreground py-2 px-4 text-center text-sm flex items-center justify-center gap-4">
            <span>You are viewing the dashboard as <strong>{currentUser?.name}</strong>.</span>
            <Button variant="outline" size="sm" className="h-7" onClick={stopImpersonating}>
                <XSquare className="mr-2 h-4 w-4" />
                Return to Admin View
            </Button>
        </div>
    )
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, isImpersonating, stopImpersonating } = useAuth();
  const pathname = usePathname();

  const isAdminView = currentUser?.role?.includes('Admin');
  
  const dashboardPath = isAdminView && !isImpersonating ? '/admin' : '/';
  const isDashboardActive = (isAdminView && !isImpersonating && pathname === '/admin') || (!isAdminView && pathname === '/');


  return (
    <SidebarProvider>
      <div className="min-h-screen">
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-2">
              <div className="bg-primary rounded-lg p-1.5">
                <Droplets className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-semibold tracking-tight">AquaWise</h1>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
                 <SidebarMenuItem>
                    <Link href={dashboardPath}>
                        <SidebarMenuButton tooltip="Dashboard" isActive={isDashboardActive}>
                        <AreaChart />
                        <span>Dashboard</span>
                        </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
             
              {isAdminView && !isImpersonating && (
                <>
                    <SidebarMenuItem>
                        <Link href="/admin/users">
                            <SidebarMenuButton tooltip="Users" isActive={pathname.startsWith('/admin/users')}>
                            <Users />
                            <span>Users</span>
                            </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <Link href="/admin/allocations">
                            <SidebarMenuButton tooltip="Allocations" isActive={pathname.startsWith('/admin/allocations')}>
                            <Target />
                            <span>Allocations</span>
                            </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <Link href="/admin/data-upload">
                            <SidebarMenuButton tooltip="Data Upload" isActive={pathname.startsWith('/admin/data-upload')}>
                            <Upload />
                            <span>Data Upload</span>
                            </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                </>
              )}
              
                <SidebarMenuItem>
                    <Link href="/admin/settings">
                        <SidebarMenuButton tooltip="Settings" isActive={pathname.startsWith('/admin/settings')}>
                            <Settings />
                            <span>Settings</span>
                        </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>

               {/* Show link only for Super Admins. For now, we simulate this with Alice. */}
               {currentUser?.email.includes('alice') && !isImpersonating && (
                 <SidebarMenuItem>
                    <Link href="/super-admin">
                      <SidebarMenuButton tooltip="Companies" isActive={pathname === '/super-admin'}>
                        <Building2 />
                        <span>Companies</span>
                      </SidebarMenuButton>
                    </Link>
                 </SidebarMenuItem>
               )}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            <div className="p-2">
                <UnitSwitcher />
            </div>
            <div className="flex items-center gap-3 p-2">
              <Avatar className="h-9 w-9">
                <AvatarImage
                  src={`https://i.pravatar.cc/150?u=${currentUser?.email}`}
                  alt={currentUser?.name ?? "User"}
                />
                <AvatarFallback>
                  {currentUser?.name
                    ? currentUser.name.charAt(0).toUpperCase()
                    : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col text-sm truncate">
                <span className="font-semibold">{currentUser?.name}</span>
                <span className="text-muted-foreground truncate">
                  {isImpersonating ? '(Impersonating)' : currentUser?.email}
                </span>
              </div>
              <Button variant="ghost" size="icon" className="ml-auto" onClick={isImpersonating ? stopImpersonating : undefined}>
                {isImpersonating ? <XSquare /> : <LogOut />}
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
            {isImpersonating && <ImpersonationBanner />}
            {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
