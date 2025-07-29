
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Settings, Calendar, PlusCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { WaterOrder, User, Unit } from "@/lib/data";
import { getWaterOrdersByCompany, updateWaterOrderStatus, getUsersByCompany, addWaterOrder, checkOrderAvailability, checkAndCompleteExpiredOrders } from "@/lib/data";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { WaterOrderForm } from "@/components/dashboard/WaterOrderForm";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { useUnit } from "@/contexts/UnitContext";


export default function AdminWaterOrdersPage() {
    const { currentUser, company } = useAuth();
    const { getUnitLabel } = useUnit();
    const { toast } = useToast();
    const [orders, setOrders] = useState<WaterOrder[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRejectionDialogOpen, setIsRejectionDialogOpen] = useState(false);
    const [orderToReject, setOrderToReject] = useState<WaterOrder | null>(null);
    const [rejectionNotes, setRejectionNotes] = useState("");
    const [isFormOpen, setIsFormOpen] = useState(false);

    const userMap = new Map(users.map(u => [u.id, u.name]));
    const isCustomer = currentUser?.role?.includes('Customer');

    const fetchOrdersAndUsers = async () => {
        if (!currentUser?.companyId) return;
        setLoading(true);

        // Auto-complete any expired orders before fetching the list
        await checkAndCompleteExpiredOrders(currentUser.companyId);
        
        const [companyOrders, companyUsers] = await Promise.all([
            getWaterOrdersByCompany(currentUser.companyId),
            getUsersByCompany(currentUser.companyId)
        ]);
        setOrders(companyOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        setUsers(companyUsers);
        setLoading(false);
    }

    useEffect(() => {
        if (currentUser?.companyId && company?.waterOrdersEnabled) {
            fetchOrdersAndUsers();
        } else {
            setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser, company]);

    const handleFormSubmit = async (data: Omit<WaterOrder, 'id' | 'companyId' | 'userId' | 'status' | 'createdAt'>) => {
        if (!currentUser || !currentUser.companyId) return;

        const isAvailable = await checkOrderAvailability(currentUser.companyId, data.startDate, data.endDate, data.totalGallons);

        if (!isAvailable) {
            toast({
                variant: "destructive",
                title: "Request Exceeds Availability",
                description: "Your requested water order exceeds the system's available capacity for that period. Please view the calendar and choose a different date or time.",
                duration: 9000
            });
            // Don't close the form, allow user to edit
            return;
        }

        await addWaterOrder({
            ...data,
            userId: currentUser.id,
            companyId: currentUser.companyId,
        });

        toast({
            title: "Water Order Submitted",
            description: "Your request has been sent for approval.",
        });

        setIsFormOpen(false);
        fetchOrdersAndUsers();
    };

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
    <TooltipProvider>
        <AppLayout>
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <div className="flex items-center justify-between space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight">Manage Water Orders</h2>
                    {company?.waterOrdersEnabled && (
                        <div className="flex items-center space-x-2">
                            {isCustomer && (
                                <Button onClick={() => setIsFormOpen(true)}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    New Water Order
                                </Button>
                            )}
                            <Button variant="outline" asChild>
                                <Link href="/admin/water-calendar">
                                    <Calendar className="mr-2 h-4 w-4" />
                                    View Calendar
                                </Link>
                            </Button>
                            <Button variant="outline" asChild>
                                <Link href="/admin/availability">
                                    <Settings className="mr-2 h-4 w-4" />
                                    Manage System Availability
                                </Link>
                            </Button>
                        </div>
                    )}
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Water Order Requests</CardTitle>
                        <CardDescription>
                            {company?.waterOrdersEnabled
                                ? "Review and manage all user-submitted water order requests."
                                : "Water ordering is currently disabled for this company. To enable it, go to Settings."
                            }
                        </CardDescription>
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
                                ) : orders.length > 0 && company?.waterOrdersEnabled ? (
                                    orders.map((order) => (
                                        <TableRow key={order.id} className={order.userId === currentUser?.id ? 'bg-muted/50' : ''}>
                                            <TableCell className="font-medium">{userMap.get(order.userId) || 'Unknown User'}</TableCell>
                                            <TableCell>
                                                {format(new Date(order.startDate), 'P p')} - {format(new Date(order.endDate), 'P p')}
                                            </TableCell>
                                            <TableCell>{order.amount} {getUnitLabel(order.unit)}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={getBadgeVariant(order.status)} className="capitalize">{order.status}</Badge>
                                                    {order.status === 'rejected' && order.adminNotes && (
                                                        <Tooltip>
                                                            <TooltipTrigger>
                                                                <Info className="h-4 w-4 text-muted-foreground" />
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p className="max-w-xs text-sm">
                                                                    <strong>Admin Note:</strong> {order.adminNotes}
                                                                </p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{order.adminNotes || 'N/A'}</TableCell>
                                            <TableCell className="text-right">
                                                {order.status === 'pending' && (
                                                    <div className="flex items-center justify-end space-x-2">
                                                        <Button variant="outline" size="sm" onClick={() => handleStatusChange(order.id, 'approved')}>
                                                            Approve
                                                        </Button>
                                                        <Button variant="destructive" size="sm" onClick={() => handleRejectionRequest(order)}>
                                                            Reject
                                                        </Button>
                                                    </div>
                                                )}
                                                {order.status === 'approved' && (
                                                    <div className="flex items-center justify-end space-x-2">
                                                        <Button variant="outline" size="sm" onClick={() => handleStatusChange(order.id, 'completed')}>
                                                            Mark as Complete
                                                        </Button>
                                                        <Button variant="destructive" size="sm" onClick={() => handleRejectionRequest(order)}>
                                                            Reject
                                                        </Button>
                                                    </div>
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

             <WaterOrderForm
                isOpen={isFormOpen}
                onOpenChange={setIsFormOpen}
                onSubmit={handleFormSubmit}
            />

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
    </TooltipProvider>
  );
}

    