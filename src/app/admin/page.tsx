
"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { useAuth } from "@/contexts/AuthContext";
import { Droplets, TrendingUp, Users, User } from "lucide-react";
import type { UsageEntry, Allocation, User as UserType } from "@/lib/data";
import { getUsageForUser, getAllocationsForUser, getUsersByCompany } from "@/lib/data";
import { format, isWithinInterval, parseISO, differenceInDays, max, min } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { UserSelector } from "@/components/dashboard/UserSelector";
import { useRouter } from "next/navigation";
import { UsageDonutChart } from "@/components/dashboard/UsageDonutChart";
import { DailyUsageChart } from "@/components/dashboard/DailyUsageChart";

export default function AdminDashboardPage() {
  const { currentUser, company, impersonateUser } = useAuth();
  const router = useRouter();
  const [companyUsers, setCompanyUsers] = useState<UserType[]>([]);
  const [usageData, setUsageData] = useState<Record<string, UsageEntry[]>>({});
  const [allAllocations, setAllAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [queryRange, setQueryRange] = useState<DateRange>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser?.companyId) return;

      setLoading(true);
      try {
        const fromDate = queryRange?.from ? format(queryRange.from, "yyyy-MM-dd") : undefined;
        const toDate = queryRange?.to ? format(queryRange.to, "yyyy-MM-dd") : undefined;
        
        const users = await getUsersByCompany(currentUser.companyId);
        setCompanyUsers(users);

        const usagePromises = users.map(user => getUsageForUser(user.id, fromDate, toDate));
        const allocationsPromise = getAllocationsForUser(currentUser.id); // Assuming allocations are company-wide for now

        const [allUsageData, allocs] = await Promise.all([
          Promise.all(usagePromises),
          allocationsPromise
        ]);

        const usageDataByUser: Record<string, UsageEntry[]> = {};
        users.forEach((user, index) => {
          usageDataByUser[user.id] = allUsageData[index];
        });
        
        setUsageData(usageDataByUser);
        setAllAllocations(allocs);

      } catch (error) {
        console.error("Failed to fetch admin dashboard data:", error);
        setUsageData({});
        setAllAllocations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, queryRange]);
  
  const handleUserSelect = async (userId: string) => {
    if (userId === 'all') {
        // We are already on the aggregate view, do nothing.
        return;
    }
    await impersonateUser(userId);
    router.push('/');
  }

  // Aggregate Metrics
  const allUsageEntries = Object.values(usageData).flat();
  const totalCompanyUsage = allUsageEntries.reduce((acc, entry) => acc + entry.usage, 0);
  const totalUsers = companyUsers.length;
  const avgUserUsage = totalUsers > 0 ? totalCompanyUsage / totalUsers : 0;
  
  const donutChartData = companyUsers.map(user => {
      const userUsage = usageData[user.id]?.reduce((sum, entry) => sum + entry.usage, 0) || 0;
      const userColor = `hsl(var(--chart-${(parseInt(user.id, 10) % 5) + 1}))`;
      return {
          name: user.name,
          value: userUsage,
          fill: userColor
      }
  }).filter(d => d.value > 0);

  const dailyChartData = allUsageEntries.reduce((acc, entry) => {
    const existing = acc.find(d => d.date === entry.date);
    if(existing) {
        existing.usage += entry.usage;
    } else {
        acc.push({ date: entry.date, usage: entry.usage });
    }
    return acc;
  }, [] as { date: string, usage: number }[]).sort((a,b) => a.date.localeCompare(b.date));


  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">
                {company?.name} Dashboard
            </h2>
            <div className="hidden md:flex items-center space-x-2">
                 <UserSelector 
                    users={companyUsers}
                    onUserChange={handleUserSelect}
                    showAllOption={false}
                    triggerLabel="View User Dashboard"
                 />
            </div>
        </div>
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
             <Skeleton className="h-28" />
             <Skeleton className="h-28" />
             <Skeleton className="h-28" />
             <Skeleton className="h-96 md:col-span-2" />
             <Skeleton className="h-96" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <MetricCard 
                    title="Total Company Usage" 
                    metric={`${totalCompanyUsage.toLocaleString()} gal`}
                    icon={Droplets} 
                    description="Total water used across all users" 
                />
                <MetricCard 
                    title="Average User Usage" 
                    metric={`${Math.round(avgUserUsage).toLocaleString()} gal`} 
                    icon={TrendingUp} 
                    description="Average usage per user in period" 
                />
                <MetricCard 
                    title="Active Users" 
                    metric={totalUsers.toString()}
                    icon={Users}
                    description="Total users in the company"
                />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <DailyUsageChart data={dailyChartData} />
                </div>
                <div className="lg:col-span-1">
                    <UsageDonutChart data={donutChartData} title="Usage by User" description="Breakdown of water usage per user." />
                </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
