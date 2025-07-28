
"use client";

import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { WaterCalendar } from "@/components/dashboard/WaterCalendar";

export default function WaterCalendarPage() {

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Water Calendar</h2>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>System Capacity Calendar</CardTitle>
            <CardDescription>
              View daily water availability against approved and pending orders. All values are shown in your company's default unit.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WaterCalendar />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
