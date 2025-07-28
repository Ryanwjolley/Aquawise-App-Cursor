

"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { useAuth } from "@/contexts/AuthContext";
import { Droplets, TrendingUp, Users, Target } from "lucide-react";
import type { UsageEntry, Allocation, User as UserType, UserGroup } from "@/lib/data";
import { getUsageForUser, getAllocationsForUser, getUsersByCompany, getUserById, getGroupsByCompany, calculateUserAllocation, getAllocationsByCompany } from "@/lib/data";
import { format, parseISO } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { UserSelector } from "@/components/dashboard/UserSelector";
import { useSearchParams, useRouter } from "next/navigation";
import { UsageDonutChart } from "@/components/dashboard/UsageDonutChart";
import { DailyUsageChart } from "@/components/dashboard/DailyUsageChart";
import { DateRangeSelector } from "@/components/dashboard/DateRangeSelector";
import { UserDashboard } from "@/components/dashboard/UserDashboard";
import { useUnit } from "@/contexts/UnitContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";


// A component to render the aggregate company or group view
function AggregateDashboard({ title, users, allCompanyUsers, allUsageData, allAllocations, queryRange }) {
    const { convertUsage, getUnitLabel } = useUnit();
    const allUsageEntries = users.map(u => allUsageData[u.id] || []).flat();

    const totalUsage = allUsageEntries.reduce((acc, entry) => acc + entry.usage, 0);
    const totalUsers = users.length;
    const avgUserUsage = totalUsers > 0 ? totalUsage / totalUsers : 0;
    const totalShares = users.reduce((acc, user) => acc + (user.shares || 0), 0);
    
    const totalAllocation = users.reduce((acc, user) => {
        return acc + calculateUserAllocation(user, allCompanyUsers, allAllocations, queryRange);
    }, 0);

    const allocationUsagePercent = totalAllocation > 0 ? (totalUsage / totalAllocation) * 100 : 0;

    const convertedTotalUsage = convertUsage(totalUsage);
    const convertedTotalAllocation = convertUsage(totalAllocation);

    const donutChartData = users.map(user => {
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
            existing.usage += convertUsage(entry.usage);
        } else {
            acc.push({ date: entry.date, usage: convertUsage(entry.usage) });
        }
        return acc;
    }, [] as { date: string, usage: number }[]).sort((a,b) => a.date.localeCompare(b.date));


    return (
        <>
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">
                    {title}
                </h2>
                {totalShares > 0 && (
                     <div className="text-lg text-muted-foreground font-medium">
                        Total Shares: {totalShares.toLocaleString()}
                    </div>
                )}
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard 
                    title="Total Usage" 
                    metric={`${convertedTotalUsage.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${getUnitLabel()}`}
                    icon={Droplets} 
                    description="Total water used across all users in this view" 
                />
                <MetricCard 
                    title="Total Allocation" 
                    metric={`${convertedTotalAllocation.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${getUnitLabel()}`} 
                    icon={Target} 
                    description="Total allocation for this view in the period" 
                />
                 {totalAllocation > 0 ? (
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Allocation Used</CardTitle>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{Math.round(allocationUsagePercent)}%</div>
                            <p className="text-xs text-muted-foreground">
                                {convertedTotalUsage.toLocaleString(undefined, { maximumFractionDigits: 2 })} of {convertedTotalAllocation.toLocaleString(undefined, { maximumFractionDigits: 2 })} {getUnitLabel()}
                            </p>
                            <Progress value={allocationUsagePercent} className="mt-2 h-2" />
                        </CardContent>
                    </Card>
                ) : (
                    <MetricCard 
                        title="Allocation Used" 
                        metric="N/A"
                        icon={Target}
                        description="No allocation set for this period"
                    />
                )}
                <MetricCard 
                    title="Active Users" 
                    metric={totalUsers.toString()}
                    icon={Users}
                    description="Total users in this view"
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
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [selectedView, setSelectedView] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [allUsageData, setAllUsageData] = useState<Record<string, UsageEntry[]>>({});
  const [allCompanyAllocations, setAllCompanyAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialRangeSet, setInitialRangeSet] = useState(false);
  
  const [queryRange, setQueryRange] = useState<DateRange>({
    from: undefined,
    to: undefined,
  });

  // Set initial user from search params
  useEffect(() => {
    const viewUserId = searchParams.get('viewUser');
    if (viewUserId) {
        setSelectedView(viewUserId);
        // Clean up URL
        router.replace('/admin');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


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

        if (company?.userGroupsEnabled) {
            const groups = await getGroupsByCompany(currentUser.companyId);
            setUserGroups(groups);
        }

        const usagePromises = users.map(user => getUsageForUser(user.id, fromDate, toDate));
        const allUsageResults = await Promise.all(usagePromises);

        const usageDataByUser: Record<string, UsageEntry[]> = {};
        users.forEach((user, index) => {
          usageDataByUser[user.id] = allUsageResults[index];
        });
        setAllUsageData(usageDataByUser);

        // Fetch allocations once and pass them down
        const companyAllocations = await getAllocationsByCompany(currentUser.companyId);
        setAllCompanyAllocations(companyAllocations);
        

        // Set default date range to most recent allocation if not already set
        if (!initialRangeSet) {
          if (companyAllocations.length > 0) {
            const mostRecentAllocation = companyAllocations.sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0];
            setQueryRange({ from: parseISO(mostRecentAllocation.startDate), to: parseISO(mostRecentAllocation.endDate) });
          } else {
            // Fallback if no allocations
            setQueryRange({ from: new Date(new Date().setDate(new Date().getDate() - 30)), to: new Date() });
          }
          setInitialRangeSet(true);
        }


      } catch (error) {
        console.error("Failed to fetch admin dashboard data:", error);
        setAllUsageData({});
        setAllCompanyAllocations([]);
      } finally {
        setLoading(false);
      }
    };

    // Only run fetch if we have a date range, or if the initial range hasn't been set yet.
    if (currentUser?.companyId && (!initialRangeSet || (queryRange.from && queryRange.to))) {
      fetchData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, company, queryRange]);

  // Update selected user object when ID changes
  useEffect(() => {
    if (selectedView === 'all' || selectedView.startsWith('group_')) {
        setSelectedUser(null);
    } else {
        getUserById(selectedView).then(setSelectedUser);
    }
  }, [selectedView])
  

  const handleViewSelect = (viewId: string) => {
    setSelectedView(viewId);
  }

  const renderContent = () => {
    if (loading || !initialRangeSet) {
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
    
    if (selectedView === 'all') {
        return <AggregateDashboard title={`${company?.name} Dashboard`} users={companyUsers} allCompanyUsers={companyUsers} allUsageData={allUsageData} allAllocations={allCompanyAllocations} queryRange={queryRange} />;
    }

    if (selectedView.startsWith('group_')) {
        const groupId = selectedView.replace('group_', '');
        const group = userGroups.find(g => g.id === groupId);
        const groupUsers = companyUsers.filter(u => u.userGroupId === groupId);
        return <AggregateDashboard title={`${group?.name} Group Dashboard`} users={groupUsers} allCompanyUsers={companyUsers} allUsageData={allUsageData} allAllocations={allCompanyAllocations} queryRange={queryRange} />;
    }
    
    if (selectedUser) {
        const userUsage = allUsageData[selectedView] || [];
        return (
            <UserDashboard 
                user={selectedUser} 
                usageData={userUsage} 
                allocations={allCompanyAllocations} 
                queryRange={queryRange} 
            />
        );
    }

    return <div>Select a user or group to begin.</div>;
  }
  
  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
            <div/>
            <div className="hidden md:flex items-center space-x-2">
                 <UserSelector 
                    users={companyUsers}
                    userGroups={company?.userGroupsEnabled ? userGroups : []}
                    onUserChange={handleViewSelect}
                    showAllOption={true}
                    defaultValue={selectedView}
                    triggerLabel="View Dashboard For..."
                 />
                 <DateRangeSelector 
                    onUpdate={(range) => setQueryRange(range)} 
                    selectedRange={queryRange} 
                    allocations={allCompanyAllocations}
                 />
            </div>
        </div>
        {renderContent()}
      </div>
    </AppLayout>
  );
}
