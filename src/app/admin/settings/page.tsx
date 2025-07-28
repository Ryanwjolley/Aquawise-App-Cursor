
"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { BellRing, Mail, Droplets } from "lucide-react";
import { NotificationsSetup } from "@/components/dashboard/NotificationsSetup";
import { useToast } from "@/hooks/use-toast";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { updateCompany } from "@/lib/data";
import type { Unit } from "@/lib/data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const displaySettingsSchema = z.object({
  defaultUnit: z.enum(["gallons", "kgal", "acre-feet"]),
});

type DisplaySettingsFormValues = z.infer<typeof displaySettingsSchema>;

export default function SettingsPage() {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { toast } = useToast();
  const { company, reloadCompany } = useAuth();
  
  const { 
    control, 
    handleSubmit, 
    reset,
    formState: { isSubmitting, isDirty }
  } = useForm<DisplaySettingsFormValues>({
    resolver: zodResolver(displaySettingsSchema),
  });

  useEffect(() => {
    if (company) {
      reset({ defaultUnit: company.defaultUnit || 'gallons' });
    }
  }, [company, reset]);


  const handleNotificationsSave = (data: any) => {
    console.log("Saving notification settings:", data);
    // Here you would typically save the data to your backend
    toast({
      title: "Settings Saved",
      description: "Your notification preferences have been updated.",
    });
    setIsNotificationsOpen(false);
  };
  
  const onDisplaySettingsSubmit = async (data: DisplaySettingsFormValues) => {
    if (!company) return;
    
    try {
        await updateCompany({ ...company, defaultUnit: data.defaultUnit as Unit });
        toast({
            title: "Settings Saved",
            description: "Default display unit has been updated.",
        });
        await reloadCompany();
    } catch (e) {
        console.error("Failed to save display settings:", e);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to save display settings."
        })
    }
  }

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        </div>
        <div className="grid gap-6">
            <form onSubmit={handleSubmit(onDisplaySettingsSubmit)}>
                <Card>
                    <CardHeader>
                        <CardTitle>Display Settings</CardTitle>
                        <CardDescription>
                            Set the default unit for displaying water usage across the system. Individual users can override this in their own view.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-2 max-w-sm">
                            <Label htmlFor="defaultUnit">Default Reporting Unit</Label>
                             <Controller
                                name="defaultUnit"
                                control={control}
                                render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger id="defaultUnit">
                                        <SelectValue placeholder="Select a unit" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="gallons">Gallons</SelectItem>
                                        <SelectItem value="kgal">kGal (Thousands)</SelectItem>
                                        <SelectItem value="acre-feet">Acre-Feet</SelectItem>
                                    </SelectContent>
                                </Select>
                                )}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="border-t px-6 py-4">
                        <Button type="submit" disabled={isSubmitting || !isDirty}>Save</Button>
                    </CardFooter>
                </Card>
            </form>
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
