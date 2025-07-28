
"use client";

import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle } from "lucide-react";

// Mock data for available and configured integrations
const availableIntegrations = [
  { name: "HydroLink Metering", description: "Automated data import for HydroLink smart meters." },
  { name: "AgriFlow Systems", description: "Connect to AgriFlow pump controllers." },
  { name: "Trimble Water", description: "Sync usage data from Trimble water management solutions." }
];

const configuredIntegrations: any[] = [
    // Initially, no integrations are configured.
];

export default function DataSourcesPage() {
  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Data Sources</h2>
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle>Configured Integrations</CardTitle>
                <CardDescription>
                    Manage your active integrations for automatic usage data fetching.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {configuredIntegrations.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                        <p>No integrations configured yet.</p>
                        <p className="text-sm">Select from the available integrations below to get started.</p>
                    </div>
                ) : (
                    <div>{/* List of configured integrations would go here */}</div>
                )}
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Available Integrations</CardTitle>
                <CardDescription>
                    Connect AquaWise to third-party software to automate your data collection.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
                {availableIntegrations.map((integration, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                            <h3 className="text-lg font-semibold">{integration.name}</h3>
                            <p className="text-sm text-muted-foreground">{integration.description}</p>
                        </div>
                        <Button disabled>
                           <PlusCircle className="mr-2 h-4 w-4"/>
                           Connect
                        </Button>
                    </div>
                ))}
            </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
