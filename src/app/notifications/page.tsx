
"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Notification, getNotificationsForUser, markNotificationAsRead, markAllNotificationsAsRead } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

export default function NotificationsPage() {
    const { currentUser } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

    const fetchNotifications = async () => {
        if (!currentUser) return;
        setLoading(true);
        const userNotifications = await getNotificationsForUser(currentUser.id);
        setNotifications(userNotifications);
        setLoading(false);
    };

    useEffect(() => {
        fetchNotifications();
    }, [currentUser]);
    
     useEffect(() => {
        const handleNotificationUpdate = () => {
             fetchNotifications();
        };

        window.addEventListener('notifications-updated', handleNotificationUpdate);
        return () => {
            window.removeEventListener('notifications-updated', handleNotificationUpdate);
        };
    }, [currentUser]);

    const handleNotificationClick = (notification: Notification) => {
        setSelectedNotification(notification);
        if (!notification.isRead) {
            markNotificationAsRead(notification.id);
            // We can optimistically update the UI if needed, but for simplicity we re-fetch
            fetchNotifications(); 
        }
    };

    const handleMarkAllAsRead = async () => {
        if (!currentUser) return;
        await markAllNotificationsAsRead(currentUser.id);
        fetchNotifications();
    }
    
    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <AppLayout>
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <div className="flex items-center justify-between space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight">Notifications</h2>
                    {unreadCount > 0 && (
                        <Button variant="outline" onClick={handleMarkAllAsRead}>
                            <CheckCheck className="mr-2 h-4 w-4" />
                            Mark All as Read
                        </Button>
                    )}
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>A log of all alerts and updates for your account.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <p>Loading notifications...</p>
                        ) : notifications.length > 0 ? (
                            <ul className="space-y-1">
                                {notifications.map(n => (
                                    <li key={n.id} 
                                        onClick={() => handleNotificationClick(n)}
                                        className={cn(
                                            "grid grid-cols-[25px_1fr] items-start p-3 border-b last:border-b-0 rounded-md cursor-pointer hover:bg-muted",
                                            !n.isRead ? "font-semibold" : "text-muted-foreground"
                                    )}>
                                        <span className={cn(
                                            "flex h-2 w-2 translate-y-1.5 rounded-full",
                                            !n.isRead ? "bg-primary" : "bg-muted"
                                        )} />
                                        <div className="grid gap-1">
                                            <p className="text-sm text-foreground">
                                                {n.message}
                                            </p>
                                            <p className="text-xs">
                                                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                           <div className="text-center py-12 text-muted-foreground">
                                <p>You're all caught up!</p>
                                <p className="text-sm">You have no new notifications.</p>
                           </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={!!selectedNotification} onOpenChange={(isOpen) => !isOpen && setSelectedNotification(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Notification Details</DialogTitle>
                         <DialogDescription>
                            Received {selectedNotification ? formatDistanceToNow(new Date(selectedNotification.createdAt), { addSuffix: true }) : ''}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 text-sm max-h-96 overflow-y-auto" dangerouslySetInnerHTML={{ __html: selectedNotification?.details || '' }} />
                    <DialogFooter>
                        {selectedNotification?.link && (
                            <Button asChild>
                                <Link href={selectedNotification.link}>View Details</Link>
                            </Button>
                        )}
                        <DialogClose asChild>
                            <Button variant={selectedNotification?.link ? 'outline' : 'default'}>Close</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </AppLayout>
    )

}
