
"use client";

import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay, differenceInDays, parseISO, startOfDay } from 'date-fns';
import { getWaterAvailabilities, getWaterOrdersByCompany, WaterAvailability, WaterOrder, getUsersByCompany, User } from '@/lib/data';
import { useAuth } from '@/contexts/AuthContext';
import { useUnit } from '@/contexts/UnitContext';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import Link from 'next/link';

type DailyData = {
  date: Date;
  availability: number;
  approved: number;
  pending: number;
  orders: (WaterOrder & { userName?: string })[];
};

export function WaterCalendar() {
  const { currentUser } = useAuth();
  const { convertUsage, getUnitLabel } = useUnit();
  const [currentDate, setCurrentDate] = useState(new Date('2025-07-01')); // Start on a month with data
  const [monthlyData, setMonthlyData] = useState<Record<string, DailyData>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
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

    fetchData();
  }, [currentDate, currentUser]);

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
          <DayCell key={i} dayData={dayData} />
        ))}
      </div>
    </div>
  );
}

function DayCell({ dayData }: { dayData: DailyData | null }) {
  const { convertUsage, getUnitLabel } = useUnit();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role?.includes('Admin');

  if (!dayData) {
    return <div className="h-32 border-b border-r bg-muted/50" />;
  }

  const { date, availability, approved, pending, orders } = dayData;
  const remainingForPending = availability - approved;
  const totalDemand = approved + pending;
  const isOverCapacity = totalDemand > availability;
  
  const approvedPercent = availability > 0 ? (approved / availability) * 100 : 0;
  // Calculate pending percentage based on the remaining availability after approved amounts are used.
  const pendingPercent = remainingForPending > 0 ? (pending / remainingForPending) * 100 : 0;
  
  const isToday = isSameDay(date, new Date());


  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className={`h-36 border-b border-r p-2 text-sm flex flex-col cursor-pointer hover:bg-accent ${isOverCapacity ? 'border-destructive border-2' : ''}`}>
          <div className={`font-semibold ${isToday ? 'bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center' : ''}`}>
              {format(date, 'd')}
          </div>
          {availability > 0 && (
            <div className="mt-2 space-y-2 flex-grow">
              <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden flex">
                <div className="bg-primary h-full" style={{ width: `${Math.min(approvedPercent, 100)}%` }} />
                <div className="bg-amber-400 h-full" style={{ width: `${Math.min(pendingPercent, 100 - approvedPercent)}%` }} />
              </div>
              <div className="text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span>{convertUsage(approved).toLocaleString(undefined, { maximumFractionDigits: 0 })} Approved</span>
                </div>
                 <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                   <span>{convertUsage(pending).toLocaleString(undefined, { maximumFractionDigits: 0 })} Pending</span>
                </div>
              </div>
               <div className="text-xs font-medium pt-1">
                {convertUsage(availability).toLocaleString(undefined, { maximumFractionDigits: 0 })} {getUnitLabel()} Avail.
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
                        <span className="font-semibold">Remaining:</span><span className="font-bold text-foreground">{convertUsage(availability - approved).toLocaleString(undefined, { maximumFractionDigits: 0 })} {getUnitLabel()}</span>
                    </div>
                </div>
                 <div className="grid gap-2 max-h-48 overflow-auto">
                    <h5 className="font-medium leading-none text-sm">Orders</h5>
                    {dayData.orders.map(order => {
                        const orderRow = (
                            <div className="grid grid-cols-3 items-center gap-4 text-xs">
                                <span className="col-span-1 truncate">{order.userName || 'Unknown User'}</span>
                                <span className="col-span-1">{order.amount.toLocaleString()} {getUnitLabel(order.unit)}</span>
                                 <Badge variant={order.status === 'approved' || order.status === 'completed' ? 'default' : order.status === 'pending' ? 'outline' : 'destructive'} className="capitalize justify-self-end">{order.status}</Badge>
                            </div>
                        );

                        if (isAdmin) {
                            return (
                                <Link href="/admin/water-orders" key={order.id} className="rounded-md p-1 -m-1 hover:bg-accent block">
                                    {orderRow}
                                </Link>
                            )
                        }
                        return <div key={order.id} className="p-1">{orderRow}</div>;
                    })}
                </div>
            </div>
         </PopoverContent>
       )}
    </Popover>
  );
}
