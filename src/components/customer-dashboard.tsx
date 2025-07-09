'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Droplets, LineChart, Scale, CalendarDays } from 'lucide-react';
import DailyUsageChart from './daily-usage-chart';
import UsageDonutChart from './usage-donut-chart';
import ConservationTips from './conservation-tips';
import { getWeeklyAllocation, getDailyUsageForDateRange, DailyUsage } from '@/firestoreService';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';


const DEFAULT_GALLONS_PER_SHARE = 2000;
const currentUser = { name: 'John Farmer', shares: 5 };

export default function CustomerDashboard() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfWeek(new Date(2025, 6, 6), { weekStartsOn: 0 }),
    to: endOfWeek(new Date(2025, 6, 6), { weekStartsOn: 0 }),
  });
  const [month, setMonth] = useState<Date>(date?.from ?? new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [weeklyAllocation, setWeeklyAllocation] = useState(0);
  const [waterUsed, setWaterUsed] = useState(0);
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const fetchWeeklyData = async () => {
        if (!date?.from || !date?.to) return;
        setLoading(true);

        try {
            const allocationPerShare = await getWeeklyAllocation(date.from);
            const totalAllocation = (allocationPerShare ?? DEFAULT_GALLONS_PER_SHARE) * currentUser.shares;
            setWeeklyAllocation(totalAllocation);

            const dailyData = await getDailyUsageForDateRange(currentUser.name, date.from, date.to);
            setDailyUsage(dailyData);
            
            const totalUsed = dailyData.reduce((acc, day) => acc + day.gallons, 0);
            setWaterUsed(totalUsed);

        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Data Fetch Failed',
                description: 'Could not fetch your weekly usage data.',
            });
            setWeeklyAllocation(DEFAULT_GALLONS_PER_SHARE * currentUser.shares);
            setWaterUsed(0);
            setDailyUsage([]);
        } finally {
            setLoading(false);
        }
    };
    
    fetchWeeklyData();
  }, [date, toast]);
  
  const handleDayClick = (day: Date) => {
    const weekStart = startOfWeek(day, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(day, { weekStartsOn: 0 });
    setDate({ from: weekStart, to: weekEnd });
    setMonth(weekStart);
    setIsCalendarOpen(false);
  };

  const remaining = weeklyAllocation - waterUsed;
  const usagePercentage = weeklyAllocation > 0 ? Math.round((waterUsed / weeklyAllocation) * 100) : 0;

  return (
    <div>
      <header className="flex flex-col sm:flex-row justify-between sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Welcome, {currentUser.name}</h1>
          <p className="text-muted-foreground">Here's your weekly water usage summary.</p>
        </div>
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
                <Button
                id="date"
                variant={"outline"}
                className={cn(
                    "w-auto min-w-[240px] justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                )}
                >
                <CalendarDays className="mr-2 h-4 w-4" />
                {date?.from ? (
                    date.to ? (
                    <>
                        {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                    </>
                    ) : (
                    format(date.from, "LLL dd, y")
                    )
                ) : (
                    <span>Pick a date range</span>
                )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onDayClick={handleDayClick}
                onMonthChange={setMonth}
                month={month}
                numberOfMonths={2}
                />
            </PopoverContent>
        </Popover>
      </header>
        
      {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="rounded-xl shadow-md"><CardContent className="p-6"><Skeleton className="h-[44px] w-full" /></CardContent></Card>
              <Card className="rounded-xl shadow-md"><CardContent className="p-6"><Skeleton className="h-[44px] w-full" /></CardContent></Card>
              <Card className="rounded-xl shadow-md"><CardContent className="p-6"><Skeleton className="h-[44px] w-full" /></CardContent></Card>
          </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="rounded-xl shadow-md">
            <CardContent className="p-6 flex items-center space-x-4">
                <div className="bg-blue-100 p-4 rounded-full">
                <Droplets className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                <p className="text-sm text-muted-foreground">Weekly Allocation</p>
                <p className="text-3xl font-bold text-foreground">{weeklyAllocation.toLocaleString()} <span className="text-lg font-normal text-muted-foreground">gal</span></p>
                </div>
            </CardContent>
            </Card>
            <Card className="rounded-xl shadow-md">
            <CardContent className="p-6 flex items-center space-x-4">
                <div className="bg-green-100 p-4 rounded-full">
                    <LineChart className="h-6 w-6 text-green-500" />
                </div>
                <div>
                <p className="text-sm text-muted-foreground">Water Used</p>
                <p className="text-3xl font-bold text-foreground">{waterUsed.toLocaleString()} <span className="text-lg font-normal text-muted-foreground">gal</span></p>
                </div>
            </CardContent>
            </Card>
            <Card className="rounded-xl shadow-md">
            <CardContent className="p-6 flex items-center space-x-4">
                <div className="bg-yellow-100 p-4 rounded-full">
                    <Scale className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                <p className="text-sm text-muted-foreground">Remaining</p>
                <p className="text-3xl font-bold text-foreground">{remaining.toLocaleString()} <span className="text-lg font-normal text-muted-foreground">gal</span></p>
                </div>
            </CardContent>
            </Card>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 rounded-xl shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">Daily Usage (Gallons)</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            {loading ? <div className="w-full h-full flex items-center justify-center"><Skeleton className="w-full h-full" /></div> : <DailyUsageChart data={dailyUsage} />}
          </CardContent>
        </Card>
        <div className="space-y-6">
            <Card className="rounded-xl shadow-md">
                <CardHeader>
                    <CardTitle className="text-xl">Usage Overview</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex flex-col items-center">
                            <Skeleton className="w-48 h-48 rounded-full" />
                            <Skeleton className="h-5 w-3/4 mt-6" />
                        </div>
                    ): (
                        <>
                        <div className="relative w-48 h-48 mx-auto">
                            <UsageDonutChart value={usagePercentage} />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-4xl font-bold text-foreground">{usagePercentage}%</span>
                            </div>
                        </div>
                        <p className="mt-6 text-center text-muted-foreground">You have used {usagePercentage}% of your weekly water allocation.</p>
                        </>
                    )}
                </CardContent>
            </Card>
             {loading ? <Skeleton className="h-56 rounded-xl" /> : <ConservationTips weeklyAllocation={weeklyAllocation} waterUsed={waterUsed} />}
        </div>
      </div>
    </div>
  );
}
