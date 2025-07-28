
"use client";

import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay, differenceInDays, parseISO, startOfDay } from 'date-fns';
import { getWaterAvailabilities, getWaterOrdersByCompany, WaterAvailability, WaterOrder, getUsersByCompany, User, updateWaterOrderStatus, getUnitLabel as getUnitLabelFromData } from '@/lib/data';
import { useAuth } from '@/contexts/AuthContext';
import { useUnit } from '@/contexts/UnitContext';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';


type DailyData = {
  date: Date;
  availability: number;
  approved: number;
  pending: number;
  orders: (WaterOrder & { userName?: string })[];
};

export function WaterCalendar() {
  const { currentUser } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date('2025-07-01')); // Start on a month with data
  const [monthlyData, setMonthlyData] = useState<Record<string, DailyData>>({});
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<WaterOrder | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isRejectionDialogOpen, setIsRejectionDialogOpen] = useState(false);
  const [rejectionNotes, setRejectionNotes] = useState("");
  const { toast } = useToast();

  const fetchAndProcessData = async () => {
    if (!currentUser?.companyId) return;
    setLoading(true);

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);

    const [availabilities, orders, users] = await Promise.all([
      getWaterAvailabilities(currentUser.companyId),
      getWaterOrdersByCompany(currentUser.companyId),
      getUsersByCompany(currentUser.companyId),
    ]);
    
    const userMap = new Map(users.map(u => [u.id, u.name]));

    const data: Record<string, DailyData> = {};
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    for (const day of daysInMonth) {
      const dayStart = startOfDay(day);
      const dayKey = format(dayStart, 'yyyy-MM-dd');
      
      const dayAvailability = availabilities.reduce((total, avail) => {
        const availStart = startOfDay(parseISO(avail.startDate));
        const availEnd = startOfDay(parseISO(avail.endDate));
        if (dayStart >= availStart && dayStart <= availEnd) {
           const durationDays = differenceInDays(availEnd, availStart) + 1;
           return total + (avail.gallons / durationDays);
        }
        return total;
      }, 0);

      let approvedDemand = 0;
      let pendingDemand = 0;
      const dayOrders: (WaterOrder & { userName?: string })[] = [];

      for (const order of orders) {
        const orderStart = startOfDay(parseISO(order.startDate));
        const orderEnd = startOfDay(parseISO(order.endDate));
        
        if (dayStart >= orderStart && dayStart <= orderEnd) {
          const durationDays = differenceInDays(orderEnd, orderStart) + 1;
          const dailyGallons = order.totalGallons / durationDays;

          if (order.status === 'approved' || order.status === 'completed') {
            approvedDemand += dailyGallons;
          } else if (order.status === 'pending') {
            pendingDemand += dailyGallons;
          }
          dayOrders.push({...order, userName: userMap.get(order.userId)});
        }
      }

      data[dayKey] = {
        date: day,
        availability: dayAvailability,
        approved: approvedDemand,
        pending: pendingDemand,
        orders: dayOrders,
      };
    }
    setMonthlyData(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchAndProcessData();
  }, [currentDate, currentUser]);
  
  const handleOrderClick = (order: WaterOrder) => {
      setSelectedOrder(order);
      setIsDetailsModalOpen(true);
  }
  
  const handleStatusChange = async (orderId: string, status: 'approved' | 'rejected' | 'completed', notes?: string) => {
    if (!currentUser) return;
    
    try {
        await updateWaterOrderStatus(orderId, status, currentUser.id, notes);
        toast({
            title: "Order Updated",
            description: `The water order has been successfully ${status}.`,
        });
        setIsDetailsModalOpen(false);
        setSelectedOrder(null);
        fetchAndProcessData(); // Re-fetch data to update calendar
    } catch (error) {
         toast({
            variant: "destructive",
            title: "Update Failed",
            description: "Could not update the order status. Please try again.",
        });
    }
  };

  const handleRejectionRequest = () => {
    if (!selectedOrder) return;
    setRejectionNotes("");
    setIsDetailsModalOpen(false); // Close details modal
    setIsRejectionDialogOpen(true); // Open rejection dialog
  };

  const handleRejectionConfirm = async () => {
    if (!selectedOrder) return;
    await handleStatusChange(selectedOrder.id, 'rejected', rejectionNotes);
    setIsRejectionDialogOpen(false);
  };


  const weeks = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const weeksArray: (DailyData | null)[][] = [];
    const firstDayOfMonth = getDay(monthStart);

    let currentWeek: (DailyData | null)[] = Array(firstDayOfMonth).fill(null);

    days.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      currentWeek.push(monthlyData[dayKey] || null);
      if (currentWeek.length === 7) {
        weeksArray.push(currentWeek);
        currentWeek = [];
      }
    });

    if (currentWeek.length > 0) {
      while(currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeksArray.push(currentWeek);
    }
    
    return weeksArray;
  }, [currentDate, monthlyData]);

  if (loading) {
      return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <Skeleton className="h-8 w-32" />
                <div className="flex gap-2">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                </div>
            </div>
            <div className="grid grid-cols-7 border-t border-l">
                {Array.from({ length: 35 }).map((_, i) => (
                    <div key={i} className="h-32 border-b border-r p-2">
                        <Skeleton className="h-4 w-8 mb-2" />
                        <Skeleton className="h-6 w-full" />
                    </div>
                ))}
            </div>
        </div>
      )
  }

  return (
    <>
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">{format(currentDate, 'MMMM yyyy')}</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center font-semibold text-sm text-muted-foreground border-t border-l">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="py-2 border-b border-r">{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 border-l">
        {weeks.flat().map((dayData, i) => (
          <DayCell key={i} dayData={dayData} onOrderClick={handleOrderClick} />
        ))}
      </div>
    </div>
    
    <OrderDetailsDialog 
        isOpen={isDetailsModalOpen}
        onOpenChange={setIsDetailsModalOpen}
        order={selectedOrder}
        onStatusChange={handleStatusChange}
        onRejectionRequest={handleRejectionRequest}
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
                <AlertDialogCancel onClick={() => setIsRejectionDialogOpen(false)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRejectionConfirm}>Confirm Rejection</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

function DayCell({ dayData, onOrderClick }: { dayData: DailyData | null, onOrderClick: (order: WaterOrder) => void; }) {
  const { convertUsage, getUnitLabel } = useUnit();

  if (!dayData) {
    return <div className="h-36 border-b border-r bg-muted/50" />;
  }

  const { date, availability, approved, pending, orders } = dayData;
  const remainingForPending = availability - approved;
  const totalDemand = approved + pending;
  const isOverCapacity = totalDemand > availability;
  
  const approvedPercent = availability > 0 ? (approved / availability) * 100 : 0;
  const pendingPercent = availability > 0 ? (pending / (availability - approved)) * 100 : 0;
  
  const isToday = isSameDay(date, new Date());


  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className={`h-36 border-b border-r p-2 text-sm flex flex-col cursor-pointer hover:bg-accent ${isOverCapacity ? 'border-destructive border-2' : ''}`}>
          <div className={`font-semibold ${isToday ? 'bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center' : ''}`}>
              {format(date, 'd')}
          </div>
          {availability > 0 && (
            <div className="mt-2 space-y-1 flex-grow">
              <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden flex">
                <div className="bg-primary h-full" style={{ width: `${Math.min(approvedPercent, 100)}%` }} />
                <div className="bg-amber-400 h-full" style={{ width: `${Math.min(pendingPercent, 100 - approvedPercent)}%` }} />
              </div>
               <div className="text-xs font-medium pt-1 space-y-0.5">
                <div>
                    <span>Avail:</span>
                    <span className="font-semibold float-right">{convertUsage(availability).toLocaleString(undefined, { maximumFractionDigits: 0 })} {getUnitLabel()}</span>
                </div>
                <div>
                    <span>Req:</span>
                    <span className="font-semibold float-right">{convertUsage(totalDemand).toLocaleString(undefined, { maximumFractionDigits: 0 })} {getUnitLabel()}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </PopoverTrigger>
       {dayData.orders.length > 0 && (
         <PopoverContent className="w-80">
            <div className="grid gap-4">
                <div className="space-y-2">
                    <h4 className="font-medium leading-none">Status for {format(date, 'MMM d, yyyy')}</h4>
                    <div className="text-sm text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1">
                        <span className="font-semibold">Total Available:</span><span>{convertUsage(availability).toLocaleString(undefined, { maximumFractionDigits: 0 })} {getUnitLabel()}</span>
                        <span className="font-semibold">Approved:</span><span>{convertUsage(approved).toLocaleString(undefined, { maximumFractionDigits: 0 })} {getUnitLabel()}</span>
                        <span className="font-semibold">Pending:</span><span>{convertUsage(pending).toLocaleString(undefined, { maximumFractionDigits: 0 })} {getUnitLabel()}</span>
                        <span className="font-semibold text-foreground">Remaining:</span><span className="font-bold text-foreground">{convertUsage(availability - approved).toLocaleString(undefined, { maximumFractionDigits: 0 })} {getUnitLabel()}</span>
                    </div>
                </div>
                 <div className="grid gap-2 max-h-48 overflow-auto">
                    <h5 className="font-medium leading-none text-sm">Orders</h5>
                    {dayData.orders.map(order => (
                        <button key={order.id} onClick={() => onOrderClick(order)} className="rounded-md p-1 -m-1 text-left hover:bg-accent block w-full">
                            <div className="grid grid-cols-3 items-center gap-4 text-xs">
                                <span className="col-span-1 truncate">{order.userName || 'Unknown User'}</span>
                                <span className="col-span-1">{order.amount.toLocaleString()} {getUnitLabelFromData(order.unit)}</span>
                                <Badge variant={order.status === 'approved' || order.status === 'completed' ? 'default' : order.status === 'pending' ? 'outline' : 'destructive'} className="capitalize justify-self-end">{order.status}</Badge>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
         </PopoverContent>
       )}
    </Popover>
  );
}


function OrderDetailsDialog({ isOpen, onOpenChange, order, onStatusChange, onRejectionRequest }: { 
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    order: WaterOrder | null;
    onStatusChange: (orderId: string, status: 'approved' | 'rejected' | 'completed', notes?: string) => void;
    onRejectionRequest: () => void;
}) {
    const { currentUser } = useAuth();
    const isAdmin = currentUser?.role?.includes('Admin');

    if (!order) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Order Details</DialogTitle>
                    <DialogDescription>
                        Requested by {order.userName || "Unknown User"}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 text-sm">
                    <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                        <Label>Status</Label>
                        <Badge variant={order.status === 'approved' || order.status === 'completed' ? 'default' : order.status === 'pending' ? 'outline' : 'destructive'} className="capitalize w-fit">{order.status}</Badge>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                        <Label>Requested Period</Label>
                        <div>
                            <p>{format(parseISO(order.startDate), 'P p')}</p>
                            <p>to {format(parseISO(order.endDate), 'P p')}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                        <Label>Request</Label>
                        <span>{order.amount} {getUnitLabelFromData(order.unit)}</span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                        <Label>Total Volume</Label>
                        <span>{order.totalGallons.toLocaleString(undefined, {maximumFractionDigits: 0})} Gallons</span>
                    </div>
                    {order.adminNotes && (
                        <div className="grid grid-cols-[120px_1fr] items-start gap-4">
                            <Label>Admin Notes</Label>
                            <p className="text-muted-foreground bg-muted/50 p-2 rounded-md">{order.adminNotes}</p>
                        </div>
                    )}
                </div>
                {isAdmin && (
                    <DialogFooter>
                         {order.status === 'pending' && (
                            <Button onClick={() => onStatusChange(order.id, 'approved')}>Approve</Button>
                         )}
                         {order.status === 'approved' && (
                            <Button onClick={() => onStatusChange(order.id, 'completed')}>Mark as Complete</Button>
                         )}
                         {(order.status === 'pending' || order.status === 'approved') && (
                            <Button variant="destructive" onClick={onRejectionRequest}>Reject</Button>
                         )}
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}
