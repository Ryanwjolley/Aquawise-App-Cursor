'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Droplets, LineChart, Scale, CalendarDays } from 'lucide-react';
import DailyUsageChart from './daily-usage-chart';
import UsageDonutChart from './usage-donut-chart';
import ConservationTips from './conservation-tips';

export default function CustomerDashboard() {
  const weeklyAllocation = 10000;
  const waterUsed = 7500;
  const remaining = weeklyAllocation - waterUsed;
  const usagePercentage = Math.round((waterUsed / weeklyAllocation) * 100);

  return (
    <div>
      <header className="flex flex-col sm:flex-row justify-between sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Welcome, John Farmer</h1>
          <p className="text-muted-foreground">Here's your weekly water usage summary.</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          <span>Week: July 6 - July 12, 2025</span>
        </div>
      </header>

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
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 rounded-xl shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">Daily Usage (Gallons)</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <DailyUsageChart />
          </CardContent>
        </Card>
        <div className="space-y-6">
            <Card className="rounded-xl shadow-md">
                <CardHeader>
                    <CardTitle className="text-xl">Usage Overview</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="relative w-48 h-48 mx-auto">
                        <UsageDonutChart value={usagePercentage} />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-4xl font-bold text-foreground">{usagePercentage}%</span>
                        </div>
                    </div>
                    <p className="mt-6 text-center text-muted-foreground">You have used {usagePercentage}% of your weekly water allocation.</p>
                </CardContent>
            </Card>
            <ConservationTips weeklyAllocation={weeklyAllocation} waterUsed={waterUsed} />
        </div>
      </div>
    </div>
  );
}
