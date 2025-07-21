"use client";

import { AppLayout } from "@/components/AppLayout";
import { DailyUsageChart } from "@/components/dashboard/DailyUsageChart";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { UsageDonutChart } from "@/components/dashboard/UsageDonutChart";
import { useAuth } from "@/contexts/AuthContext";
import { Droplets, TrendingUp, Users } from "lucide-react";

// Mock data for charts
const dailyUsageData = [
  { date: "2024-05-01", usage: 450 },
  { date: "2024-05-02", usage: 520 },
  { date: "2024-05-03", usage: 380 },
  { date: "2024-05-04", usage: 610 },
  { date: "2024-05-05", usage: 750 },
  { date: "2024-05-06", usage: 590 },
  { date: "2024-05-07", usage: 640 },
];

const userUsageData = [
    { name: "Bob W.", value: 8100, fill: "hsl(var(--chart-1))" },
    { name: "Charlie B.", value: 3500, fill: "hsl(var(--chart-2))" },
    { name: "You", value: 5200, fill: "hsl(var(--chart-3))" },
]

export default function HomePage() {
  const { currentUser } = useAuth();
  
  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">
                Hi, Welcome back {currentUser?.name?.split(' ')[0]} 👋
            </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard 
                title="Total Usage" 
                metric="16,800 gal" 
                icon={Droplets} 
                description="Total water used this month" 
            />
            <MetricCard 
                title="Avg. Daily Usage" 
                metric="560 gal" 
                icon={TrendingUp} 
                description="Average daily usage this month" 
            />
            <MetricCard 
                title="Active Users" 
                metric="3" 
                icon={Users}
                description="Users with reported usage"
            />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <div className="lg:col-span-4">
                <DailyUsageChart data={dailyUsageData} />
            </div>
            <div className="lg:col-span-3">
                <UsageDonutChart 
                    data={userUsageData} 
                    title="Usage by User"
                    description="Breakdown of water usage per user."
                />
            </div>
        </div>
      </div>
    </AppLayout>
  );
}
