
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
import { Textarea } from "@/components/ui/textarea";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
import { PlusCircle, Trash2 } from "lucide-react";

const notificationsSchema = z.object({
  allocationChangeAlerts: z.object({
      enabled: z.boolean().default(true),
      message: z.string().optional(),
  }),
  thresholdAlerts: z.object({
    enabled: z.boolean().default(false),
    thresholds: z.array(z.object({
        percentage: z.number().min(0).max(100)
    })).default([{ percentage: 80 }]),
    email: z.string().email().or(z.literal("")),
    message: z.string().optional(),
  }),
  spikeAlerts: z.object({
    enabled: z.boolean().default(false),
    percentage: z.coerce.number().min(0).default(50),
    email: z.string().email().or(z.literal("")),
    message: z.string().optional(),
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
        message: "Hello {{userName}}, your water allocation has been {{updateType}}. The new period is from {{startDate}} to {{endDate}} with an amount of {{gallons}} gallons."
    },
    thresholdAlerts: {
        enabled: true,
        thresholds: [
            { percentage: 75 },
            { percentage: 90 },
            { percentage: 100 },
        ],
        email: 'billing@gva.com',
        message: "Hi {{userName}}, you have reached {{percentage}}% of your water allocation for the period. Current usage: {{usage}} of {{allocation}} gallons."
    },
    spikeAlerts: {
        enabled: false,
        percentage: 50,
        email: 'ops@gva.com',
        message: "Hi {{userName}}, we've detected a usage spike. Your usage yesterday was {{usage}} gallons, which is {{spikePercentage}}% higher than your weekly average."
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

  const { fields, append, remove } = useFieldArray({
    control,
    name: "thresholdAlerts.thresholds"
  });

  // Reset form when dialog opens/closes
  useEffect(() => {
    if(isOpen) {
        // Here you would fetch existing settings and reset the form
        reset(MOCK_EXISTING_SETTINGS);
    }
  }, [isOpen, reset]);

  const watchedAllocationEnabled = watch("allocationChangeAlerts.enabled");
  const watchedThresholdEnabled = watch("thresholdAlerts.enabled");
  const watchedSpikeEnabled = watch("spikeAlerts.enabled");
  
  const handleAddNewThreshold = () => {
    // Add a new threshold with a default value.
    // For simplicity, let's just add one at 50, user can change it.
    if(fields.length < 5) { // Limit to 5 thresholds for UI sanity
        append({ percentage: 50 });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={handleSubmit(onSave)}>
          <DialogHeader>
            <DialogTitle>Notification Settings</DialogTitle>
            <DialogDescription>
              Configure automated alerts. Alerts are sent to the administrator and to the user based on their individual notification preferences.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-6 max-h-[70vh] overflow-y-auto pr-4">
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
                 <div className={`space-y-4 pt-4 transition-opacity ${watchedAllocationEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                    <Separator/>
                     <div>
                        <Label htmlFor="allocation-message">Notification Message</Label>
                         <Controller
                            name="allocationChangeAlerts.message"
                            control={control}
                            render={({ field }) => (
                                <Textarea id="allocation-message" placeholder="Enter your notification message..." {...field} disabled={!watchedAllocationEnabled} />
                            )}
                        />
                        <p className="text-xs text-muted-foreground pt-1">Variables: `{'{{userName}}'}`, `{'{{updateType}}'}`, `{'{{startDate}}'}`, `{'{{endDate}}'}`, `{'{{gallons}}'}`</p>
                    </div>
                </div>
            </div>

            {/* Threshold Alerts */}
            <div className="space-y-4 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                     <div>
                        <Label htmlFor="threshold-enabled" className="text-base font-medium">Usage Threshold Alerts</Label>
                        <p className="text-sm text-muted-foreground pt-1">Notify when usage exceeds set percentages of the total allocation.</p>
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
                    <div className="space-y-4">
                        <Label>Notification Thresholds</Label>
                        {fields.map((field, index) => (
                           <div key={field.id} className="flex items-center gap-4">
                                <Controller
                                    name={`thresholdAlerts.thresholds.${index}.percentage`}
                                    control={control}
                                    render={({ field: controllerField }) => (
                                        <div className="flex-grow flex items-center gap-4">
                                            <Slider
                                                min={0}
                                                max={100}
                                                step={5}
                                                value={[controllerField.value]}
                                                onValueChange={(value) => controllerField.onChange(value[0])}
                                                disabled={!watchedThresholdEnabled}
                                            />
                                            <span className="text-lg font-semibold w-16 text-center">{controllerField.value}%</span>
                                        </div>
                                    )}
                                />
                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={!watchedThresholdEnabled || fields.length <= 1}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                           </div>
                        ))}
                         <Button type="button" variant="outline" size="sm" onClick={handleAddNewThreshold} disabled={!watchedThresholdEnabled || fields.length >= 5}>
                            <PlusCircle className="mr-2 h-4 w-4"/>
                            Add Threshold
                        </Button>
                    </div>
                     <div>
                        <Label htmlFor="threshold-email">Send admin alert to email</Label>
                        <Controller
                            name="thresholdAlerts.email"
                            control={control}
                            render={({ field }) => (
                                <Input id="threshold-email" type="email" placeholder="admin-recipient@example.com" {...field} disabled={!watchedThresholdEnabled} />
                            )}
                        />
                         {errors.thresholdAlerts?.email && <p className="text-sm text-destructive pt-1">{errors.thresholdAlerts.email.message}</p>}
                    </div>
                     <div>
                        <Label htmlFor="threshold-message">Notification Message</Label>
                         <Controller
                            name="thresholdAlerts.message"
                            control={control}
                            render={({ field }) => (
                                <Textarea id="threshold-message" placeholder="Enter your notification message..." {...field} disabled={!watchedThresholdEnabled} />
                            )}
                        />
                         <p className="text-xs text-muted-foreground pt-1">Variables: `{'{{userName}}'}`, `{'{{percentage}}'}`, `{'{{usage}}'}`, `{'{{allocation}}'}`</p>
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
                        <Label htmlFor="spike-email">Send admin alert to email</Label>
                        <Controller
                            name="spikeAlerts.email"
                            control={control}
                            render={({ field }) => (
                                <Input id="spike-email" type="email" placeholder="admin-recipient@example.com" {...field} disabled={!watchedSpikeEnabled} />
                            )}
                        />
                         {errors.spikeAlerts?.email && <p className="text-sm text-destructive pt-1">{errors.spikeAlerts.email.message}</p>}
                    </div>
                     <div>
                        <Label htmlFor="spike-message">Notification Message</Label>
                         <Controller
                            name="spikeAlerts.message"
                            control={control}
                            render={({ field }) => (
                                <Textarea id="spike-message" placeholder="Enter your notification message..." {...field} disabled={!watchedSpikeEnabled} />
                            )}
                        />
                         <p className="text-xs text-muted-foreground pt-1">Variables: `{'{{userName}}'}`, `{'{{usage}}'}`, `{'{{spikePercentage}}'}`</p>
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
