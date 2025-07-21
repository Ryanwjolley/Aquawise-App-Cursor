
"use client";

import { AppLayout } from "@/components/AppLayout";
import { DailyUsageChart } from "@/components/dashboard/DailyUsageChart";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { useAuth } from "@/contexts/AuthContext";
import { Droplets, TrendingUp, CalendarDays } from "lucide-react";
import { DateRangeSelector } from "@/components/dashboard/DateRangeSelector";
import { useState, useEffect } from "react";
import type { UsageEntry } from "@/lib/data";
import { getUsageForUser } from "@/lib/data";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Skeleton } from "@/components/ui/skeleton";

export default function CustomerDashboardPage() {
  const { currentUser } = useAuth();
  const [usageData, setUsageData] = useState<UsageEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [queryRange, setQueryRange] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return; // Don't fetch if user isn't loaded yet

      setLoading(true);
      try {
        const fromDate = queryRange?.from ? format(queryRange.from, "yyyy-MM-dd") : undefined;
        const toDate = queryRange?.to ? format(queryRange.to, "yyyy-MM-dd") : undefined;
        
        const data = await getUsageForUser(currentUser.id, fromDate, toDate);
        setUsageData(data);
      } catch (error) {
        console.error("Failed to fetch usage data:", error);
        setUsageData([]); // Clear data on error
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, queryRange]); // Rerun when user or queryRange changes

  const totalUsage = usageData.reduce((acc, entry) => acc + entry.usage, 0);
  const avgDailyUsage = usageData.length > 0 ? totalUsage / usageData.length : 0;
  const daysWithUsage = usageData.length;

  const dailyChartData = usageData.map(entry => ({
    date: entry.date,
    usage: entry.usage
  }));

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">
                Hi, Welcome back {currentUser?.name?.split(' ')[0]} 👋
            </h2>
            <div className="hidden md:flex items-center space-x-2">
                <DateRangeSelector onUpdate={(range) => setQueryRange(range)} />
            </div>
        </div>
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
             <Skeleton className="h-28" />
             <Skeleton className="h-28" />
             <Skeleton className="h-28" />
             <Skeleton className="h-80 lg:col-span-3" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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