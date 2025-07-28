
"use client";

import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { WaterCalendar } from "@/components/dashboard/WaterCalendar";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";


export default function AdminWaterCalendarPage() {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role?.includes('Admin');

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Water Calendar</h2>
           {isAdmin && (
            <Button variant="outline" asChild>
                <Link href="/admin/availability">
                    <Settings className="mr-2 h-4 w-4" />
                    Manage System Availability
                </Link>
            </Button>
           )}
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
