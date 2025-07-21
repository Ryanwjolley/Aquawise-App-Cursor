
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
import { Home, Users, Settings, LogOut, Droplets, Building2, Upload, Target } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const pathname = usePathname();

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
                <Link href="/">
                  <SidebarMenuButton tooltip="Dashboard" isActive={pathname === '/'}>
                    <Home />
                    <span>Dashboard</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              {currentUser?.role === 'Admin' && (
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
              {currentUser?.role === 'Admin' && (
                 <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Settings">
                      <Settings />
                      <span>Settings</span>
                    </SidebarMenuButton>
                 </SidebarMenuItem>
              )}
               {/* Show link only for Super Admins. For now, we simulate this with Alice. */}
               {currentUser?.email.includes('alice') && (
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
            <div className="flex items-center gap-3">
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
                  {currentUser?.email}
                </span>
              </div>
              <Button variant="ghost" size="icon" className="ml-auto">
                <LogOut />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>{children}</SidebarInset>
      </div>
    </SidebarProvider>
  );
}
