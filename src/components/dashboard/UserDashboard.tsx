

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DailyUsageChart } from "@/components/dashboard/DailyUsageChart";
import { MetricCard } from "@/components/dashboard/MetricCard";
import type { Allocation, UsageEntry, User } from "@/lib/data";
import { Target, Droplets, TrendingUp, CalendarDays } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { useUnit } from "@/contexts/UnitContext";
import { calculateUserAllocation } from "@/lib/data";
import { useState, useEffect } from "react";
import { getUsersByCompany } from "@/lib/data";


interface UserDashboardProps {
    user: User | null;
    usageData: UsageEntry[];
    allocations: Allocation[];
    queryRange: DateRange;
}


export function UserDashboard({ user, usageData, allocations, queryRange }: UserDashboardProps) {
    const { unit, convertUsage, getUnitLabel } = useUnit();
    const [allCompanyUsers, setAllCompanyUsers] = useState<User[]>([]);

    useEffect(() => {
        if(user?.companyId) {
            getUsersByCompany(user.companyId).then(setAllCompanyUsers);
        }
    }, [user]);

    if (!user || allCompanyUsers.length === 0) return null;
    
    const totalUsage = usageData.reduce((acc, entry) => acc + entry.usage, 0);

    const dailyChartData = usageData.map(entry => ({
        date: entry.date,
        usage: convertUsage(entry.usage)
    })).sort((a,b) => a.date.localeCompare(b.date));

    const allocationForPeriod = calculateUserAllocation(user, allCompanyUsers, allocations, queryRange);
    const allocationUsagePercent = allocationForPeriod > 0 ? (totalUsage / allocationForPeriod) * 100 : 0;
    
    const convertedTotalUsage = convertUsage(totalUsage);
    const convertedAllocationForPeriod = convertUsage(allocationForPeriod);


    return (
         <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">
                    {user?.name}'s Dashboard
                </h2>
                {user?.shares ? (
                    <div className="text-lg text-muted-foreground font-medium">
                        Shares: {user.shares.toLocaleString()}
                    </div>
                ) : null}
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <MetricCard 
                    title="Total Usage" 
                    metric={`${convertedTotalUsage.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${getUnitLabel()}`}
                    icon={Droplets} 
                    description="Total water used in the selected period" 
                />
                <MetricCard 
                    title="Total Allocation"
                    metric={`${convertedAllocationForPeriod.toLocaleString(undefined, {maximumFractionDigits: 1})} ${getUnitLabel()}`}
                    icon={Target}
                    description="Total allocation in the selected period"
                />
                
                {allocationForPeriod > 0 ? (
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Allocation Used</CardTitle>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{Math.round(allocationUsagePercent)}%</div>
                            <p className="text-xs text-muted-foreground">
                                {convertedTotalUsage.toLocaleString(undefined, { maximumFractionDigits: 1 })} of {convertedAllocationForPeriod.toLocaleString(undefined, { maximumFractionDigits: 1 })} {getUnitLabel()}
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
            </div>
            <div className="grid gap-4">
                <DailyUsageChart data={dailyChartData} />
            </div>
          </div>
    )
}
