
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
import { PlusCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { WaterOrder, User } from "@/lib/data";
import { getWaterOrdersForUser, addWaterOrder } from "@/lib/data";
import { WaterOrderForm } from "@/components/dashboard/WaterOrderForm";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";


export default function CustomerWaterOrdersPage() {
    const { currentUser } = useAuth();
    const { toast } = useToast();
    const [orders, setOrders] = useState<WaterOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const fetchOrders = async () => {
        if (!currentUser) return;
        setLoading(true);
        const userOrders = await getWaterOrdersForUser(currentUser.id);
        setOrders(userOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        setLoading(false);
    }

    useEffect(() => {
        if (currentUser) {
            fetchOrders();
        }
    }, [currentUser]);

    const handleFormSubmit = async (data: Omit<WaterOrder, 'id' | 'companyId' | 'userId' | 'status' | 'createdAt'> & { totalGallons: number }) => {
        if (!currentUser) return;

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
        fetchOrders();
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
                    <h2 className="text-3xl font-bold tracking-tight">My Water Orders</h2>
                     <Button onClick={() => setIsFormOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Request Water Order
                    </Button>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>My Order History</CardTitle>
                        <CardDescription>A list of all your submitted water order requests.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                <TableHead>Date Range</TableHead>
                                <TableHead>Flow Rate</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Submitted On</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center">
                                    Loading orders...
                                    </TableCell>
                                </TableRow>
                                ) : orders.length > 0 ? (
                                    orders.map((order) => (
                                        <TableRow key={order.id}>
                                            <TableCell className="font-medium">
                                                {format(new Date(order.startDate), 'P p')} - {format(new Date(order.endDate), 'P p')}
                                            </TableCell>
                                            <TableCell>{order.flowRate} {order.flowUnit.toUpperCase()}</TableCell>
                                            <TableCell>
                                                <Badge variant={getBadgeVariant(order.status)} className="capitalize">{order.status}</Badge>
                                            </TableCell>
                                            <TableCell>{format(new Date(order.createdAt), 'P p')}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center">
                                            You haven't submitted any water orders yet.
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
        </AppLayout>
    );
}
