
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DailyUsageChart } from "@/components/dashboard/DailyUsageChart";
import { MetricCard } from "@/components/dashboard/MetricCard";
import type { Allocation, UsageEntry, User } from "@/lib/data";
import { Target, Droplets, TrendingUp, CalendarDays } from "lucide-react";
import { differenceInDays, max, min, parseISO } from "date-fns";
import type { DateRange } from "react-day-picker";

interface UserDashboardProps {
    user: User | null;
    usageData: UsageEntry[];
    allocations: Allocation[];
    queryRange: DateRange;
}

// Function to calculate proportional allocation
const calculateProportionalAllocation = (range: DateRange, allocations: Allocation[]): number => {
    if (!range.from || !range.to) return 0;

    let totalProportionalGallons = 0;

    for (const alloc of allocations) {
        const allocStart = parseISO(alloc.startDate);
        const allocEnd = parseISO(alloc.endDate);

        // Find the overlapping interval
        const overlapStart = max([range.from, allocStart]);
        const overlapEnd = min([range.to, allocEnd]);
        
        if (overlapStart < overlapEnd) {
            const overlapDays = differenceInDays(overlapEnd, overlapStart) + 1;
            const totalAllocDays = differenceInDays(allocEnd, allocStart) + 1;
            
            if (totalAllocDays > 0) {
                const dailyAllocation = alloc.gallons / totalAllocDays;
                totalProportionalGallons += dailyAllocation * overlapDays;
            }
        }
    }

    return totalProportionalGallons;
}


export function UserDashboard({ user, usageData, allocations, queryRange }: UserDashboardProps) {
    if (!user) return null;
    
    const totalUsage = usageData.reduce((acc, entry) => acc + entry.usage, 0);
    const avgDailyUsage = usageData.length > 0 ? totalUsage / usageData.length : 0;
    const daysWithUsage = usageData.length;

    const dailyChartData = usageData.map(entry => ({
        date: entry.date,
        usage: entry.usage
    })).sort((a,b) => a.date.localeCompare(b.date));

    const allocationForPeriod = calculateProportionalAllocation(queryRange, allocations);
    const allocationUsagePercent = allocationForPeriod > 0 ? (totalUsage / allocationForPeriod) * 100 : 0;

    return (
         <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">
                    {user?.name}'s Dashboard
                </h2>
                {user?.shares && (
                    <div className="text-lg text-muted-foreground font-medium">
                        Shares - {user.shares}
                    </div>
                )}
            </div>
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
                {allocationForPeriod > 0 ? (
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Period Allocation Usage</CardTitle>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{Math.round(allocationUsagePercent)}%</div>
                            <p className="text-xs text-muted-foreground">
                                {totalUsage.toLocaleString()} of {Math.round(allocationForPeriod).toLocaleString()} gal used
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
                <DailyUsageChart data={dailyChartData} />
            </div>
          </div>
    )
}

    