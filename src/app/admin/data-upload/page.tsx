
"use client";

import { AppLayout } from "@/components/AppLayout";
import { DataUploadForm } from "@/components/dashboard/DataUploadForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function DataUploadPage() {

  const handleDataUpload = async (data: any[]) => {
    // This is where we will handle the final upload logic in a future step.
    // For now, we'll just log it to the console.
    console.log("Preparing to upload:", data);
    alert(`${data.length} records ready for upload. Check console for details.`);
  }

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Data Upload</h2>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>Upload Usage Data</CardTitle>
                <CardDescription>
                    Upload a CSV file with user water usage. The file should have columns: `userEmail`, `date` (in YYYY-MM-DD format), and `usage` (in gallons). 
                    You can <Link href="/test-data.csv" className="underline text-primary" download>download a sample file</Link> to see the required format.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <DataUploadForm onUpload={handleDataUpload} />
            </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
