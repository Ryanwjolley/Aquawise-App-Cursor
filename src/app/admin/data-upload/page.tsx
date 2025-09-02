
"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { DataUploadForm } from "@/components/dashboard/DataUploadForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import type { User, Unit } from "@/lib/data";
import { getUsersByCompanyFS } from "@/lib/firestoreClientUsers";
import { bulkAddUsageEntriesServer } from "@/app/admin/usage-data/actions";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useUnit } from "@/contexts/UnitContext";

export default function DataUploadPage() {
  const { currentUser, company } = useAuth();
  const { toast } = useToast();
  const { getUnitLabel } = useUnit();
  const [companyUsers, setCompanyUsers] = useState<User[]>([]);

  useEffect(() => {
    if (currentUser?.companyId) {
      getUsersByCompanyFS(currentUser.companyId).then(setCompanyUsers);
    }
  }, [currentUser]);

  const handleDataUpload = async (data: any[], mode: 'overwrite' | 'new_only', unit: Unit) => {
    console.log(`Preparing to upload ${data.length} records with mode: ${mode}`);
    
    // Map emails to user IDs
    const userMap = new Map(companyUsers.map(u => [u.email, u.id]));
    
    const entriesToAdd = data.map(record => ({
      userId: userMap.get(record.userEmail)!,
      date: record.date,
      usage: parseInt(record.usage, 10),
    })).filter(entry => entry.userId); // Filter out records where user wasn't found

  if (!currentUser) return;
  const { added, updated } = await bulkAddUsageEntriesServer(currentUser.companyId, entriesToAdd, mode, unit);
    
    console.log(`Upload complete. Added: ${added}, Updated: ${updated}`);
    toast({
      title: "Upload Successful",
      description: `${added} new records added. ${updated} records updated.`,
    });
  }
  
  const unitLabel = getUnitLabel();

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
                    Upload a CSV file with user water usage. The file should have columns: `userEmail`, `date` (in YYYY-MM-DD format), and `usage` (in your company's default unit: {unitLabel}). 
                    You can <Link href="/test-data.csv" className="underline text-primary" download>download a sample file</Link> to see the required format.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <DataUploadForm onUpload={handleDataUpload} companyUsers={companyUsers} />
            </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
