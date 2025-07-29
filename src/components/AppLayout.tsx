
// /src/components/AppLayout.tsx
"use client";

import React, { useState, useEffect } from "react";
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
import { Home, Users, Settings, LogOut, Droplets, Building2, Upload, Target, XSquare, AreaChart, ClipboardList, Calendar, Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { UnitSwitcher } from "@/components/dashboard/UnitSwitcher";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getNotificationsForUser, markNotificationAsRead, Notification } from "@/lib/data";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { DevUserSwitcher } from "./DevUserSwitcher";

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

function NotificationsPopover() {
    const { currentUser } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    const fetchNotifications = async () => {
        if (!currentUser) return;
        const userNotifications = await getNotificationsForUser(currentUser.id);
        setNotifications(userNotifications);
    };

    useEffect(() => {
        if (isOpen && currentUser) {
            fetchNotifications();
        }
    }, [isOpen, currentUser]);
    
     useEffect(() => {
        const handleNotificationUpdate = () => {
             fetchNotifications();
        };

        window.addEventListener('notifications-updated', handleNotificationUpdate);
        return () => {
            window.removeEventListener('notifications-updated', handleNotificationUpdate);
        };
    }, [currentUser]);


    const handleMarkAsRead = async (id: string) => {
        await markNotificationAsRead(id);
        fetchNotifications(); // Refresh list
    }
    
    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell />
                    {unreadCount > 0 && (
                        <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center">{unreadCount}</Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
                <div className="grid gap-4">
                    <div className="space-y-2">
                        <h4 className="font-medium leading-none">Notifications</h4>
                        <p className="text-sm text-muted-foreground">
                            Recent alerts and updates.
                        </p>
                    </div>
                    <div className="grid gap-2 max-h-80 overflow-y-auto">
                        {notifications.length > 0 ? (
                            notifications.map(n => (
                                <div key={n.id} className={`grid grid-cols-[25px_1fr] items-start pb-4 last:pb-0 ${!n.isRead ? 'font-bold' : ''}`}>
                                    <span className={`flex h-2 w-2 translate-y-1 rounded-full ${!n.isRead ? 'bg-sky-500' : 'bg-muted-foreground'}`} />
                                    <div className="grid gap-1">
                                        <p className="text-sm">
                                            {n.message}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-center text-muted-foreground py-4">No new notifications.</p>
                        )}
                    </div>
                     <Button asChild variant="outline" size="sm" className="w-full">
                        <Link href="/notifications">View All Notifications</Link>
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}


export function AppLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, company, isImpersonating, stopImpersonating, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    const fetchCount = async () => {
        if(currentUser) {
            const userNotifications = await getNotificationsForUser(currentUser.id);
            setUnreadCount(userNotifications.filter(n => !n.isRead).length);
        }
    }
    
    const handleNotificationUpdate = () => {
        fetchCount();
    };

    fetchCount();
    window.addEventListener('notifications-updated', handleNotificationUpdate);
    
    return () => {
        window.removeEventListener('notifications-updated', handleNotificationUpdate);
    };

  }, [currentUser]);


  const isSuperAdminView = currentUser?.role === 'Super Admin' && !isImpersonating;
  const isAdminView = currentUser?.role?.includes('Admin');
  const isCustomerView = currentUser?.role?.includes('Customer');
  
  const dashboardPath = isAdminView ? '/admin' : '/';
  const isDashboardActive = pathname === dashboardPath || (isAdminView && pathname === '/admin' && pathname.length <= 7);

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
                 {isSuperAdminView ? (
                    <>
                        <SidebarMenuItem>
                            <Link href="/super-admin">
                                <SidebarMenuButton tooltip="Companies" isActive={pathname === '/super-admin'}>
                                    <Building2 />
                                    <span>Companies</span>
                                </SidebarMenuButton>
                            </Link>
                        </SidebarMenuItem>
                         <SidebarMenuItem>
                            <Link href="/admin/settings">
                                <SidebarMenuButton tooltip="Settings" isActive={pathname.startsWith('/admin/settings')}>
                                    <Settings />
                                    <span>Settings</span>
                                </SidebarMenuButton>
                            </Link>
                        </SidebarMenuItem>
                    </>
                 ) : (
                    <>
                        <SidebarMenuItem>
                            <Link href={dashboardPath}>
                                <SidebarMenuButton tooltip="Dashboard" isActive={isDashboardActive}>
                                <AreaChart />
                                <span>Dashboard</span>
                                </SidebarMenuButton>
                            </Link>
                        </SidebarMenuItem>
                    
                        {isAdminView && (
                            <>
                                {company?.waterOrdersEnabled && (
                                    <SidebarMenuItem>
                                        <Link href="/admin/water-orders">
                                            <SidebarMenuButton tooltip="Manage Orders" isActive={pathname.startsWith('/admin/water-orders') || pathname.startsWith('/admin/water-calendar') || pathname.startsWith('/admin/availability')}>
                                            <ClipboardList />
                                            <span>Manage Orders</span>
                                            </SidebarMenuButton>
                                        </Link>
                                    </SidebarMenuItem>
                                )}
                                <SidebarMenuItem>
                                    <Link href="/admin/usage-data">
                                        <SidebarMenuButton tooltip="Usage Data" isActive={pathname.startsWith('/admin/usage-data')}>
                                        <Upload />
                                        <span>Usage Data</span>
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
                                    <Link href="/admin/users">
                                        <SidebarMenuButton tooltip="Users" isActive={pathname.startsWith('/admin/users')}>
                                        <Users />
                                        <span>Users</span>
                                        </SidebarMenuButton>
                                    </Link>
                                </SidebarMenuItem>
                            </>
                        )} 
                        
                        {isCustomerView && !isAdminView && company?.waterOrdersEnabled && (
                            <>
                                <SidebarMenuItem>
                                    <Link href="/water-orders">
                                        <SidebarMenuButton tooltip="My Water Orders" isActive={pathname.startsWith('/water-orders')}>
                                        <ClipboardList />
                                        <span>My Water Orders</span>
                                        </SidebarMenuButton>
                                    </Link>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <Link href="/water-calendar">
                                        <SidebarMenuButton tooltip="Water Calendar" isActive={pathname.startsWith('/water-calendar')}>
                                        <Calendar />
                                        <span>Water Calendar</span>
                                        </SidebarMenuButton>
                                    </Link>
                                </SidebarMenuItem>
                            </>
                        )}

                        <SidebarMenuItem>
                            <Link href="/notifications">
                                <SidebarMenuButton tooltip="Notifications" isActive={pathname.startsWith('/notifications')}>
                                    <Bell />
                                    <span>Notifications</span>
                                </SidebarMenuButton>
                            </Link>
                        </SidebarMenuItem>

                        <SidebarMenuItem>
                            <Link href="/admin/settings">
                                <SidebarMenuButton tooltip="Settings" isActive={pathname.startsWith('/admin/settings')}>
                                    <Settings />
                                    <span>Settings</span>
                                </SidebarMenuButton>
                            </Link>
                        </SidebarMenuItem>
                    </>
                 )}

            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            <DevUserSwitcher />
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
              <div className="ml-auto flex items-center">
                 <NotificationsPopover />
                  <Button variant="ghost" size="icon" onClick={isImpersonating ? stopImpersonating : logout}>
                    {isImpersonating ? <XSquare /> : <LogOut />}
                  </Button>
              </div>
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
