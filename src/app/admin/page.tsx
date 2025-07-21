
"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { useAuth } from "@/contexts/AuthContext";
import { Droplets, TrendingUp, Users, Target } from "lucide-react";
import type { UsageEntry, Allocation, User as UserType } from "@/lib/data";
import { getUsageForUser, getAllocationsForUser, getUsersByCompany, getUserById } from "@/lib/data";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { UserSelector } from "@/components/dashboard/UserSelector";
import { useSearchParams, useRouter } from "next/navigation";
import { UsageDonutChart } from "@/components/dashboard/UsageDonutChart";
import { DailyUsageChart } from "@/components/dashboard/DailyUsageChart";
import { DateRangeSelector } from "@/components/dashboard/DateRangeSelector";
import { UserDashboard } from "@/components/dashboard/UserDashboard";


// A component to render the aggregate company view
function AggregateDashboard({ company, companyUsers, allUsageData, queryRange }) {
    const allUsageEntries = Object.values(allUsageData).flat();
    const totalCompanyUsage = allUsageEntries.reduce((acc, entry) => acc + entry.usage, 0);
    const totalUsers = companyUsers.length;
    const avgUserUsage = totalUsers > 0 ? totalCompanyUsage / totalUsers : 0;
    const totalCompanyShares = companyUsers.reduce((acc, user) => acc + (user.shares || 0), 0);
    
    const donutChartData = companyUsers.map(user => {
        const userUsage = allUsageData[user.id]?.reduce((sum, entry) => sum + entry.usage, 0) || 0;
        const userColor = `hsl(var(--chart-${(parseInt(user.id, 16) % 5) + 1}))`;
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
        <>
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">
                    {company?.name} Dashboard
                </h2>
                {totalCompanyShares > 0 && (
                     <div className="text-lg text-muted-foreground font-medium">
                        Total Shares - {totalCompanyShares.toLocaleString()}
                    </div>
                )}
            </div>
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
    );
}

export default function AdminDashboardPage() {
  const { currentUser, company } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [companyUsers, setCompanyUsers] = useState<UserType[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [allUsageData, setAllUsageData] = useState<Record<string, UsageEntry[]>>({});
  const [allAllocations, setAllAllocations] = useState<Record<string, Allocation[]>>({});
  const [loading, setLoading] = useState(true);
  
  const [queryRange, setQueryRange] = useState<DateRange>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });

  // Set initial user from search params
  useEffect(() => {
    const viewUserId = searchParams.get('viewUser');
    if (viewUserId) {
        setSelectedUserId(viewUserId);
        // Clean up URL
        router.replace('/admin');
    }
  }, [searchParams, router]);


  // Fetch all data on load and when range changes
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
        const allocationPromises = users.map(user => getAllocationsForUser(user.id));

        const allUsageResults = await Promise.all(usagePromises);
        const allAllocationResults = await Promise.all(allocationPromises);

        const usageDataByUser: Record<string, UsageEntry[]> = {};
        const allocationsByUser: Record<string, Allocation[]> = {};
        users.forEach((user, index) => {
          usageDataByUser[user.id] = allUsageResults[index];
          allocationsByUser[user.id] = allAllocationResults[index];
        });
        
        setAllUsageData(usageDataByUser);
        setAllAllocations(allocationsByUser);

      } catch (error) {
        console.error("Failed to fetch admin dashboard data:", error);
        setAllUsageData({});
        setAllAllocations({});
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, queryRange]);

  // Update selected user object when ID changes
  useEffect(() => {
    if (selectedUserId === 'all') {
        setSelectedUser(null);
    } else {
        getUserById(selectedUserId).then(setSelectedUser);
    }
  }, [selectedUserId])
  

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
  }

  const renderContent = () => {
    if (loading) {
       return (
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-1/2" />
             </div>
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
             </div>
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-96 md:col-span-2" />
                <Skeleton className="h-96" />
            </div>
          </div>
        )
    }
    
    if (selectedUserId === 'all') {
        return <AggregateDashboard company={company} companyUsers={companyUsers} allUsageData={allUsageData} queryRange={queryRange} />;
    }
    
    if (selectedUser) {
        const userUsage = allUsageData[selectedUserId] || [];
        const userAllocations = allAllocations[selectedUserId] || [];
        return (
            <UserDashboard 
                user={selectedUser} 
                usageData={userUsage} 
                allocations={userAllocations} 
                queryRange={queryRange} 
            />
        );
    }

    return <div>Select a user to begin.</div>;
  }
  
  const currentAllocations = selectedUser ? allAllocations[selectedUserId] || [] : [];

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
            <div/>
            <div className="hidden md:flex items-center space-x-2">
                 <UserSelector 
                    users={companyUsers}
                    onUserChange={handleUserSelect}
                    showAllOption={true}
                    defaultValue={selectedUserId}
                    triggerLabel="View Dashboard For..."
                 />
                 <DateRangeSelector 
                    onUpdate={(range) => setQueryRange(range)} 
                    selectedRange={queryRange} 
                    allocations={currentAllocations}
                 />
            </div>
        </div>
        {renderContent()}
      </div>
    </AppLayout>
  );
}

    