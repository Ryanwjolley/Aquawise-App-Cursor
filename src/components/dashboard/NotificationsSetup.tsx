
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";

const notificationsSchema = z.object({
  allocationChangeAlerts: z.object({
      enabled: z.boolean().default(true),
  }),
  thresholdAlerts: z.object({
    enabled: z.boolean().default(false),
    percentage: z.number().min(0).max(100).default(80),
    email: z.string().email().or(z.literal("")),
  }),
  spikeAlerts: z.object({
    enabled: z.boolean().default(false),
    percentage: z.coerce.number().min(0).default(50),
    email: z.string().email().or(z.literal("")),
  }),
}).refine(data => !data.thresholdAlerts.enabled || (data.thresholdAlerts.enabled && data.thresholdAlerts.email), {
    message: "Email is required for threshold alerts.",
    path: ["thresholdAlerts", "email"],
}).refine(data => !data.spikeAlerts.enabled || (data.spikeAlerts.enabled && data.spikeAlerts.email), {
    message: "Email is required for spike alerts.",
    path: ["spikeAlerts", "email"],
});


type NotificationsFormValues = z.infer<typeof notificationsSchema>;

// Mock existing settings - in a real app, this would be fetched from a database
const MOCK_EXISTING_SETTINGS = {
    allocationChangeAlerts: {
        enabled: true,
    },
    thresholdAlerts: {
        enabled: true,
        percentage: 85,
        email: 'billing@gva.com'
    },
    spikeAlerts: {
        enabled: false,
        percentage: 50,
        email: 'ops@gva.com'
    }
}


interface NotificationsSetupProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (data: NotificationsFormValues) => void;
}

export function NotificationsSetup({ isOpen, onOpenChange, onSave }: NotificationsSetupProps) {
  const {
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<NotificationsFormValues>({
    resolver: zodResolver(notificationsSchema),
    defaultValues: MOCK_EXISTING_SETTINGS
  });

  // Reset form when dialog opens/closes
  useEffect(() => {
    if(isOpen) {
        // Here you would fetch existing settings and reset the form
        reset(MOCK_EXISTING_SETTINGS);
    }
  }, [isOpen, reset]);

  const watchedThresholdEnabled = watch("thresholdAlerts.enabled");
  const watchedSpikeEnabled = watch("spikeAlerts.enabled");

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={handleSubmit(onSave)}>
          <DialogHeader>
            <DialogTitle>Notification Settings</DialogTitle>
            <DialogDescription>
              Configure automated alerts for important usage events.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-6">
            {/* Allocation Change Alerts */}
             <div className="space-y-4 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <Label htmlFor="allocation-change-enabled" className="text-base font-medium">Allocation Change Notifications</Label>
                        <p className="text-sm text-muted-foreground pt-1">Notify users when their allocation is created or updated.</p>
                    </div>
                    <Controller
                        name="allocationChangeAlerts.enabled"
                        control={control}
                        render={({ field }) => (
                            <Switch id="allocation-change-enabled" checked={field.value} onCheckedChange={field.onChange} />
                        )}
                    />
                </div>
            </div>

            {/* Threshold Alerts */}
            <div className="space-y-4 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                     <div>
                        <Label htmlFor="threshold-enabled" className="text-base font-medium">Usage Threshold Alerts</Label>
                        <p className="text-sm text-muted-foreground pt-1">Notify when usage exceeds a set percentage of the total allocation.</p>
                    </div>
                    <Controller
                        name="thresholdAlerts.enabled"
                        control={control}
                        render={({ field }) => (
                            <Switch id="threshold-enabled" checked={field.value} onCheckedChange={field.onChange} />
                        )}
                    />
                </div>
                <div className={`space-y-4 transition-opacity ${watchedThresholdEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                    <Separator/>
                    <div>
                        <Label htmlFor="threshold-percentage">Notify when usage exceeds</Label>
                        <Controller
                            name="thresholdAlerts.percentage"
                            control={control}
                            render={({ field }) => (
                                <div className="flex items-center gap-4 pt-2">
                                    <Slider
                                        id="threshold-percentage"
                                        min={0}
                                        max={100}
                                        step={5}
                                        value={[field.value]}
                                        onValueChange={(value) => field.onChange(value[0])}
                                        disabled={!watchedThresholdEnabled}
                                    />
                                    <span className="text-lg font-semibold w-16 text-center">{field.value}%</span>
                                </div>
                            )}
                        />
                    </div>
                     <div>
                        <Label htmlFor="threshold-email">Send alert to email</Label>
                        <Controller
                            name="thresholdAlerts.email"
                            control={control}
                            render={({ field }) => (
                                <Input id="threshold-email" type="email" placeholder="recipient@example.com" {...field} disabled={!watchedThresholdEnabled} />
                            )}
                        />
                         {errors.thresholdAlerts?.email && <p className="text-sm text-destructive pt-1">{errors.thresholdAlerts.email.message}</p>}
                    </div>
                </div>
            </div>

             {/* Spike Alerts */}
            <div className="space-y-4 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                     <div>
                        <Label htmlFor="spike-enabled" className="text-base font-medium">High Usage Spike Alerts</Label>
                        <p className="text-sm text-muted-foreground pt-1">Notify if daily usage is significantly higher than the weekly average.</p>
                    </div>
                    <Controller
                        name="spikeAlerts.enabled"
                        control={control}
                        render={({ field }) => (
                            <Switch id="spike-enabled" checked={field.value} onCheckedChange={field.onChange} />
                        )}
                    />
                </div>
                 <div className={`space-y-4 transition-opacity ${watchedSpikeEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                    <Separator/>
                    <div>
                        <Label htmlFor="spike-percentage">Notify if daily usage is higher than weekly average by</Label>
                        <Controller
                            name="spikeAlerts.percentage"
                            control={control}
                            render={({ field }) => (
                                <div className="flex items-center gap-4 pt-2">
                                   <Input id="spike-percentage" type="number" className="w-24" placeholder="50" {...field} disabled={!watchedSpikeEnabled} />
                                   <span className="text-lg font-semibold">%</span>
                                </div>
                            )}
                        />
                         {errors.spikeAlerts?.percentage && <p className="text-sm text-destructive pt-1">{errors.spikeAlerts.percentage.message}</p>}
                    </div>
                     <div>
                        <Label htmlFor="spike-email">Send alert to email</Label>
                        <Controller
                            name="spikeAlerts.email"
                            control={control}
                            render={({ field }) => (
                                <Input id="spike-email" type="email" placeholder="recipient@example.com" {...field} disabled={!watchedSpikeEnabled} />
                            )}
                        />
                         {errors.spikeAlerts?.email && <p className="text-sm text-destructive pt-1">{errors.spikeAlerts.email.message}</p>}
                    </div>
                </div>
            </div>
          </div>
          

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
