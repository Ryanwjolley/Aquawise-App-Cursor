
"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { User } from "@/lib/data";
import { updateUser } from "@/lib/data";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const settingsFormSchema = z.object({
  notificationPreference: z.enum(["email", "mobile"], {
    required_error: "Please select a notification preference.",
  }),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export default function SettingsPage() {
  const { currentUser, loading } = useAuth();
  const { toast } = useToast();
  
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
  });

  useEffect(() => {
    if (currentUser) {
      reset({
        notificationPreference: currentUser.notificationPreference,
      });
    }
  }, [currentUser, reset]);

  const onSubmit = async (data: SettingsFormValues) => {
    if (!currentUser) return;

    try {
      const updatedUserData: User = {
        ...currentUser,
        notificationPreference: data.notificationPreference,
      };
      await updateUser(updatedUserData);
      toast({
        title: "Settings Saved",
        description: "Your notification preferences have been updated.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save your settings. Please try again.",
      });
    }
  };

  if (loading) {
    return (
        <AppLayout>
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
                <p>Loading...</p>
            </div>
        </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how you would like to receive important alerts about your water usage.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Controller
                name="notificationPreference"
                control={control}
                render={({ field }) => (
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="grid gap-4"
                  >
                    <Label className="flex items-center gap-4 rounded-md border p-4 cursor-pointer hover:bg-accent has-[[data-state=checked]]:border-primary">
                        <RadioGroupItem value="email" id="email" />
                        <div>
                            <p className="font-semibold">Email</p>
                            <p className="text-sm text-muted-foreground">
                                Send notifications to your email address: {currentUser?.email}
                            </p>
                        </div>
                    </Label>
                    <Label className={`flex items-center gap-4 rounded-md border p-4 cursor-pointer hover:bg-accent has-[[data-state=checked]]:border-primary ${!currentUser?.mobileNumber ? 'cursor-not-allowed opacity-50' : ''}`}>
                       <RadioGroupItem value="mobile" id="mobile" disabled={!currentUser?.mobileNumber} />
                        <div>
                            <p className="font-semibold">Text Message (SMS)</p>
                            <p className="text-sm text-muted-foreground">
                                {currentUser?.mobileNumber
                                ? `Send notifications to your mobile number: ${currentUser.mobileNumber}`
                                : "No mobile number on file. Please contact an admin to add one."}
                            </p>
                        </div>
                    </Label>
                  </RadioGroup>
                )}
              />
              {errors.notificationPreference && (
                  <p className="text-sm text-destructive pt-4">{errors.notificationPreference.message}</p>
              )}
            </CardContent>
          </Card>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Preferences"}
          </Button>
        </form>
      </div>
    </AppLayout>
  );
}
