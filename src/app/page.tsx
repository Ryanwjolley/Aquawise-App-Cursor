
"use client";

import { AppLayout } from "@/components/AppLayout";
import { DailyUsageChart } from "@/components/dashboard/DailyUsageChart";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { useAuth } from "@/contexts/AuthContext";
import { Droplets, TrendingUp, CalendarDays, Sparkles, Wand } from "lucide-react";
import { DateRangeSelector } from "@/components/dashboard/DateRangeSelector";
import { useState, useEffect } from "react";
import type { UsageEntry } from "@/lib/data";
import { getUsageForUser } from "@/lib/data";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { analyzeUsage, type AnalyzeUsageOutput } from "@/ai/flows/analyzeUsageFlow";

export default function CustomerDashboardPage() {
  const { currentUser } = useAuth();
  const [usageData, setUsageData] = useState<UsageEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [queryRange, setQueryRange] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });

  const [aiAnalysis, setAiAnalysis] = useState<AnalyzeUsageOutput | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;

      setLoading(true);
      try {
        const fromDate = queryRange?.from ? format(queryRange.from, "yyyy-MM-dd") : undefined;
        const toDate = queryRange?.to ? format(queryRange.to, "yyyy-MM-dd") : undefined;
        
        const data = await getUsageForUser(currentUser.id, fromDate, toDate);
        setUsageData(data);
        setAiAnalysis(null); // Reset AI analysis when data changes
      } catch (error) {
        console.error("Failed to fetch usage data:", error);
        setUsageData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, queryRange]);

  const handleGetAIAnalysis = async () => {
    if (!usageData || usageData.length === 0) return;
    setIsAiLoading(true);
    setAiAnalysis(null);
    try {
      const result = await analyzeUsage({ usageData: JSON.stringify(usageData) });
      setAiAnalysis(result);
    } catch (error) {
      console.error("Failed to get AI analysis:", error);
      // Optionally, set an error state to show in the UI
    } finally {
      setIsAiLoading(false);
    }
  };

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
            <div className="flex justify-end">
              <Button onClick={handleGetAIAnalysis} disabled={isAiLoading || usageData.length === 0}>
                {isAiLoading ? "Analyzing..." : "Get AI Analysis"}
                <Wand className="ml-2 h-4 w-4" />
              </Button>
            </div>
            {isAiLoading && (
              <Card>
                <CardHeader className="flex flex-row items-center gap-2">
                  <Sparkles className="h-6 w-6 text-accent animate-pulse" />
                  <CardTitle>Analyzing your usage...</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                   <div className="pt-4 space-y-2">
                     <Skeleton className="h-4 w-1/4" />
                     <Skeleton className="h-4 w-full" />
                     <Skeleton className="h-4 w-full" />
                   </div>
                </CardContent>
              </Card>
            )}
             {aiAnalysis && (
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-accent" />
                    AI Usage Analysis
                  </CardTitle>
                  <CardDescription>{aiAnalysis.analysis}</CardDescription>
                </CardHeader>
                <CardContent>
                  <h4 className="font-semibold mb-2">Recommendations:</h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {aiAnalysis.recommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
