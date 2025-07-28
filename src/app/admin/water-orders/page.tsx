
"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { MoreHorizontal } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { WaterOrder, User } from "@/lib/data";
import { getWaterOrdersByCompany, updateWaterOrderStatus, getUsersByCompany, getUnitLabel } from "@/lib/data";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function AdminWaterOrdersPage() {
    const { currentUser } = useAuth();
    const { toast } = useToast();
    const [orders, setOrders] = useState<WaterOrder[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRejectionDialogOpen, setIsRejectionDialogOpen] = useState(false);
    const [orderToReject, setOrderToReject] = useState<WaterOrder | null>(null);
    const [rejectionNotes, setRejectionNotes] = useState("");

    const userMap = new Map(users.map(u => [u.id, u.name]));

    const fetchOrdersAndUsers = async () => {
        if (!currentUser?.companyId) return;
        setLoading(true);
        const [companyOrders, companyUsers] = await Promise.all([
            getWaterOrdersByCompany(currentUser.companyId),
            getUsersByCompany(currentUser.companyId)
        ]);
        setOrders(companyOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        setUsers(companyUsers);
        setLoading(false);
    }

    useEffect(() => {
        if (currentUser?.companyId) {
            fetchOrdersAndUsers();
        }
    }, [currentUser]);

    const handleStatusChange = async (orderId: string, status: 'approved' | 'rejected' | 'completed', notes?: string) => {
        if (!currentUser) return;
        
        try {
            await updateWaterOrderStatus(orderId, status, currentUser.id, notes);
            toast({
                title: "Order Updated",
                description: `The water order has been successfully ${status}.`,
            });
            // If an order is completed, new usage data is created, so we re-fetch everything.
            fetchOrdersAndUsers();
        } catch (error) {
             toast({
                variant: "destructive",
                title: "Update Failed",
                description: "Could not update the order status. Please try again.",
            });
        }
    };
    
    const handleRejectionRequest = (order: WaterOrder) => {
        setOrderToReject(order);
        setRejectionNotes("");
        setIsRejectionDialogOpen(true);
    };
    
    const handleRejectionConfirm = async () => {
        if (!orderToReject) return;
        await handleStatusChange(orderToReject.id, 'rejected', rejectionNotes);
        setIsRejectionDialogOpen(false);
        setOrderToReject(null);
    };

    const getBadgeVariant = (status: WaterOrder['status']) => {
        switch (status) {
            case 'approved':
                return 'default';
            case 'completed':
                return 'secondary';
            case 'rejected':
                return 'destructive';
            case 'pending':
            default:
                return 'outline';
        }
    }


  return (
    <AppLayout>
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Water Orders</h2>
            </div>
             <Card>
                <CardHeader>
                    <CardTitle>Water Order Requests</CardTitle>
                    <CardDescription>Review and manage all user-submitted water order requests.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Date Range</TableHead>
                                <TableHead>Request</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Admin Notes</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center">
                                Loading orders...
                                </TableCell>
                            </TableRow>
                            ) : orders.length > 0 ? (
                                orders.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-medium">{userMap.get(order.userId) || 'Unknown User'}</TableCell>
                                        <TableCell>
                                            {format(new Date(order.startDate), 'P p')} - {format(new Date(order.endDate), 'P p')}
                                        </TableCell>
                                        <TableCell>{order.amount} {getUnitLabel(order.unit)}</TableCell>
                                        <TableCell>
                                            <Badge variant={getBadgeVariant(order.status)} className="capitalize">{order.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{order.adminNotes || 'N/A'}</TableCell>
                                        <TableCell className="text-right">
                                            {(order.status === 'pending' || order.status === 'approved') && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        {order.status === 'pending' && (
                                                            <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'approved')}>
                                                                Approve
                                                            </DropdownMenuItem>
                                                        )}
                                                         {order.status === 'approved' && (
                                                            <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'completed')}>
                                                                Mark as Complete
                                                            </DropdownMenuItem>
                                                        )}
                                                         {(order.status === 'pending' || order.status === 'approved') && (
                                                            <DropdownMenuItem onClick={() => handleRejectionRequest(order)} className="text-destructive">
                                                                Reject
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center">
                                        No water orders have been submitted yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>

        <AlertDialog open={isRejectionDialogOpen} onOpenChange={setIsRejectionDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Reject Water Order?</AlertDialogTitle>
                    <AlertDialogDescription>
                        You are about to reject this water order. Please provide a reason for the rejection (optional). This note will be visible to the user.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="grid gap-2">
                    <Label htmlFor="rejection-notes">Rejection Notes</Label>
                    <Textarea 
                        id="rejection-notes"
                        placeholder="e.g. Canal maintenance scheduled during this time."
                        value={rejectionNotes}
                        onChange={(e) => setRejectionNotes(e.target.value)}
                    />
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setOrderToReject(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRejectionConfirm}>Confirm Rejection</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

    </AppLayout>
  );
}
