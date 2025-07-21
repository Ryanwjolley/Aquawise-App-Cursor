"use client";

import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <h2 className="text-3xl font-bold tracking-tight">
          Welcome to AquaWise
        </h2>
        <Card>
          <CardHeader>
            <CardTitle>Rebuild In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              The main application layout and sidebar have been successfully
              built. We are now ready to create the individual dashboard
              components.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
