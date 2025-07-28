
"use client";

import { AppLayout } from "@/components/AppLayout";
import { UserDashboard } from "@/components/dashboard/UserDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { DateRangeSelector } from "@/components/dashboard/DateRangeSelector";
import { useState, useEffect } from "react";
import type { UsageEntry, Allocation } from "@/lib/data";
import { getUsageForUser, getAllocationsForUser } from "@/lib/data";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Skeleton } from "@/components/ui/skeleton";


export default function CustomerDashboardPage() {
  const { currentUser } = useAuth();
  const [usageData, setUsageData] = useState<UsageEntry[]>([]);
  const [allAllocations, setAllAllocations] = useState<Allocation[]>([]);
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

      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        setUsageData([]);
        setAllAllocations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, queryRange]);


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
          <div className="space-y-4">
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
             </div>
             <Skeleton className="h-96" />
          </div>
        ) : (
          <UserDashboard
            user={currentUser}
            usageData={usageData}
            allocations={allAllocations}
            queryRange={queryRange}
          />
        )}
      </div>
    </AppLayout>
  );
}

    
