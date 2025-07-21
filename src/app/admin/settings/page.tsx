
"use client";

import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BellRing, Mail } from "lucide-react";
import { NotificationsSetup } from "@/components/dashboard/NotificationsSetup";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { toast } = useToast();

  const handleNotificationsSave = (data: any) => {
    console.log("Saving notification settings:", data);
    // Here you would typically save the data to your backend
    toast({
      title: "Settings Saved",
      description: "Your notification preferences have been updated.",
    });
    setIsNotificationsOpen(false);
  };

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        </div>
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Notifications</CardTitle>
                    <CardDescription>
                        Manage how you and your team are notified about water usage.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                            <BellRing className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div className="flex-grow">
                            <h3 className="text-lg font-medium">Usage Alerts</h3>
                            <p className="text-sm text-muted-foreground">
                                Set up automated email alerts for important usage events like exceeding allocation thresholds or detecting unusual spikes in consumption.
                            </p>
                        </div>
                        <div className="flex-shrink-0">
                            <Button onClick={() => setIsNotificationsOpen(true)}>
                                Configure
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Integrations</CardTitle>
                    <CardDescription>
                        Connect AquaWise to other services (coming soon).
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                            <Mail className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div className="flex-grow">
                            <h3 className="text-lg font-medium">Email Reports</h3>
                            <p className="text-sm text-muted-foreground">
                                Configure weekly or monthly summary reports to be sent to stakeholders.
                            </p>
                        </div>
                        <div className="flex-shrink-0">
                            <Button variant="secondary" disabled>
                                Configure
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
      <NotificationsSetup
        isOpen={isNotificationsOpen}
        onOpenChange={setIsNotificationsOpen}
        onSave={handleNotificationsSave}
      />
    </AppLayout>
  );
}
