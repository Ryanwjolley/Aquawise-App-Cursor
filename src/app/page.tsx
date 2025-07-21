
"use client";

import { AppLayout } from "@/components/AppLayout";
import { DailyUsageChart } from "@/components/dashboard/DailyUsageChart";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { useAuth } from "@/contexts/AuthContext";
import { Droplets, TrendingUp, CalendarDays, Target } from "lucide-react";
import { DateRangeSelector } from "@/components/dashboard/DateRangeSelector";
import { useState, useEffect } from "react";
import type { UsageEntry, Allocation } from "@/lib/data";
import { getUsageForUser, getAllocationsForUser } from "@/lib/data";
import { format, isWithinInterval, parseISO } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function CustomerDashboardPage() {
  const { currentUser } = useAuth();
  const [usageData, setUsageData] = useState<UsageEntry[]>([]);
  const [allAllocations, setAllAllocations] = useState<Allocation[]>([]);
  const [currentAllocation, setCurrentAllocation] = useState<Allocation | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [queryRange, setQueryRange] = useState<DateRange>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;

      setLoading(true);
      try {
        const fromDate = queryRange?.from ? format(queryRange.from, "yyyy-MM-dd") : undefined;
        const toDate = queryRange?.to ? format(queryRange.to, "yyyy-MM-dd") : undefined;
        
        const [data, allocs] = await Promise.all([
            getUsageForUser(currentUser.id, fromDate, toDate),
            getAllocationsForUser(currentUser.id)
        ]);

        setUsageData(data);
        setAllAllocations(allocs);

        // Find the allocation that applies to the current date
        const today = new Date();
        const activeAllocation = allocs.find(a => 
            isWithinInterval(today, { start: parseISO(a.startDate), end: parseISO(a.endDate) })
        );
        setCurrentAllocation(activeAllocation || null);

      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        setUsageData([]);
        setCurrentAllocation(null);
        setAllAllocations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, queryRange]);

  const totalUsage = usageData.reduce((acc, entry) => acc + entry.usage, 0);
  const avgDailyUsage = usageData.length > 0 ? totalUsage / usageData.length : 0;
  const daysWithUsage = usageData.length;

  const dailyChartData = usageData.map(entry => ({
    date: entry.date,
    usage: entry.usage
  }));

  const allocationForPeriod = allAllocations.find(a => 
    queryRange.from && queryRange.to &&
    format(parseISO(a.startDate), 'yyyy-MM-dd') === format(queryRange.from, 'yyyy-MM-dd') &&
    format(parseISO(a.endDate), 'yyyy-MM-dd') === format(queryRange.to, 'yyyy-MM-dd')
  ) || currentAllocation;
  
  const allocationUsagePercent = allocationForPeriod ? (totalUsage / allocationForPeriod.gallons) * 100 : 0;

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">
                Hi, Welcome back {currentUser?.name?.split(' ')[0]} 👋
            </h2>
            <div className="hidden md:flex items-center space-x-2">
                <DateRangeSelector 
                  onUpdate={(range) => setQueryRange(range)} 
                  selectedRange={queryRange} 
                  allocations={allAllocations}
                />
            </div>
        </div>
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
             <Skeleton className="h-28" />
             <Skeleton className="h-28" />
             <Skeleton className="h-28" />
             <Skeleton className="h-28" />
             <Skeleton className="h-80 lg:col-span-4" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard 
                    title="Total Usage" 
                    metric={`${totalUsage.toLocaleString()} gal`}
                    icon={Droplets} 
                    description="Total water used in the selected period" 
                />
                <MetricCard 
                    title="Avg. Daily Usage" 
                    metric={`${Math.round(avgDailyUsage).toLocaleString()} gal`} 
                    icon={TrendingUp} 
                    description="Average daily usage in the selected period" 
                />
                <MetricCard 
                    title="Days with Usage" 
                    metric={daysWithUsage.toString()}
                    icon={CalendarDays}
                    description="Days with reported usage in the selected period"
                />
                {allocationForPeriod ? (
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Period Allocation Usage</CardTitle>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{Math.round(allocationUsagePercent)}%</div>
                            <p className="text-xs text-muted-foreground">
                                {totalUsage.toLocaleString()} of {allocationForPeriod.gallons.toLocaleString()} gal used
                            </p>
                            <Progress value={allocationUsagePercent} className="mt-2 h-2" />
                        </CardContent>
                    </Card>
                ) : (
                    <MetricCard 
                        title="Period Allocation" 
                        metric="N/A"
                        icon={Target}
                        description="No allocation set for this period"
                    />
                )}
            </div>
            <div className="grid gap-4">
                <div className="lg:col-span-3">
                    <DailyUsageChart data={dailyChartData} />
                </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
