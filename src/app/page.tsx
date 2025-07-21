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

export default function CustomerDashboardPage() {
  const { currentUser } = useAuth();
  const [usageData, setUsageData] = useState<UsageEntry[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });

  useEffect(() => {
    if (currentUser) {
      const fetchData = async () => {
        const fromDate = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined;
        const toDate = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined;
        const data = await getUsageForUser(currentUser.id, fromDate, toDate);
        setUsageData(data);
      };
      fetchData();
    }
  }, [currentUser, dateRange]);

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
                <DateRangeSelector onUpdate={(range) => setDateRange(range)} />
            </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard 
                title="Total Usage" 
                metric={`${totalUsage.toLocaleString()} gal`}
                icon={Droplets} 
                description="Total water used in this period" 
            />
            <MetricCard 
                title="Avg. Daily Usage" 
                metric={`${Math.round(avgDailyUsage).toLocaleString()} gal`} 
                icon={TrendingUp} 
                description="Average daily usage in this period" 
            />
            <MetricCard 
                title="Days with Usage" 
                metric={daysWithUsage.toString()}
                icon={CalendarDays}
                description="Days with reported usage in this period"
            />
        </div>
        <div className="grid gap-4">
            <div className="lg:col-span-4">
                <DailyUsageChart data={dailyChartData} />
            </div>
        </div>
      </div>
    </AppLayout>
  );
}
