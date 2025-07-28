
"use client";

import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay } from 'date-fns';
import { getWaterAvailabilities, getWaterOrdersByCompany, WaterAvailability, WaterOrder } from '@/lib/data';
import { useAuth } from '@/contexts/AuthContext';
import { useUnit } from '@/contexts/UnitContext';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type DailyData = {
  date: Date;
  availability: number;
  approved: number;
  pending: number;
  orders: WaterOrder[];
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

      const [availabilities, orders] = await Promise.all([
        getWaterAvailabilities(currentUser.companyId),
        getWaterOrdersByCompany(currentUser.companyId),
      ]);

      const data: Record<string, DailyData> = {};
      const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

      for (const day of daysInMonth) {
        const dayKey = format(day, 'yyyy-MM-dd');
        
        // Calculate availability for the day
        const dayAvailability = availabilities.reduce((total, avail) => {
          const availStart = new Date(avail.startDate);
          const availEnd = new Date(avail.endDate);
          if (day >= availStart && day <= availEnd) {
             const duration = (new Date(avail.endDate).getTime() - new Date(avail.startDate).getTime()) / (1000 * 3600 * 24) + 1;
             return total + (avail.gallons / duration);
          }
          return total;
        }, 0);

        // Calculate demand from orders for the day
        let approvedDemand = 0;
        let pendingDemand = 0;
        const dayOrders: WaterOrder[] = [];

        for (const order of orders) {
          const orderStart = new Date(order.startDate);
          const orderEnd = new Date(order.endDate);
          if (day >= orderStart && day <= orderEnd) {
            const duration = (new Date(order.endDate).getTime() - new Date(order.startDate).getTime()) / (1000 * 3600 * 24) + 1;
            const dailyGallons = order.totalGallons / duration;
            if (order.status === 'approved' || order.status === 'completed') {
              approvedDemand += dailyGallons;
            } else if (order.status === 'pending') {
              pendingDemand += dailyGallons;
            }
            dayOrders.push(order);
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

  if (!dayData) {
    return <div className="h-32 border-b border-r bg-muted/50" />;
  }

  const { date, availability, approved, pending } = dayData;
  const totalDemand = approved + pending;
  const isOverCapacity = totalDemand > availability;
  const approvedPercent = availability > 0 ? (approved / availability) * 100 : 0;
  const pendingPercent = availability > 0 ? (pending / availability) * 100 : 0;
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
                    <h4 className="font-medium leading-none">Orders for {format(date, 'MMM d, yyyy')}</h4>
                    <p className="text-sm text-muted-foreground">
                        {dayData.orders.length} order(s) scheduled for this day.
                    </p>
                </div>
                <div className="grid gap-2 max-h-48 overflow-auto">
                    {dayData.orders.map(order => (
                        <div key={order.id} className="grid grid-cols-3 items-center gap-4 text-xs">
                            <span className="col-span-1">{order.amount} {order.unit}</span>
                            <span className="col-span-1">{format(new Date(order.startDate), 'h:mm a')} - {format(new Date(order.endDate), 'h:mm a')}</span>
                             <Badge variant={order.status === 'approved' ? 'default' : order.status === 'pending' ? 'outline' : 'secondary'} className="capitalize justify-self-end">{order.status}</Badge>
                        </div>
                    ))}
                </div>
            </div>
         </PopoverContent>
       )}
    </Popover>
  );
}
