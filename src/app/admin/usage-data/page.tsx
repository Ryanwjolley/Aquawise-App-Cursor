
"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { DataUploadForm } from "@/components/dashboard/DataUploadForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { bulkAddUsageEntries, getUsersByCompany, User, getUnitLabel, getUsageForUser, getAllocationsForUser, Allocation, UsageEntry } from "@/lib/data";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useUnit } from "@/contexts/UnitContext";
import { Button } from "@/components/ui/button";

export default function UsageDataPage() {
  const { currentUser, company } = useAuth();
  const { toast } = useToast();
  const { getUnitLabel, convertUsage } = useUnit();
  const [companyUsers, setCompanyUsers] = useState<User[]>([]);
  const [allUsageData, setAllUsageData] = useState<UsageEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const userMap = new Map(companyUsers.map(u => [u.id, u.name]));

  const fetchAndSetData = async () => {
    if (!currentUser?.companyId) return;
    setLoading(true);

    const users = await getUsersByCompany(currentUser.companyId);
    setCompanyUsers(users);

    const usagePromises = users.map(user => getUsageForUser(user.id));
    const allUsageResults = await Promise.all(usagePromises);
    const flattenedUsage = allUsageResults.flat().sort((a,b) => b.date.localeCompare(a.date)); // Sort by most recent
    
    setAllUsageData(flattenedUsage);
    setLoading(false);
  }

  useEffect(() => {
    if (currentUser?.companyId) {
      fetchAndSetData();
    }
  }, [currentUser]);

  const handleDataUpload = async (data: any[], mode: 'overwrite' | 'new_only') => {
    console.log(`Preparing to upload ${data.length} records with mode: ${mode}`);
    
    // Map emails to user IDs
    const userEmailMap = new Map(companyUsers.map(u => [u.email, u.id]));
    
    const entriesToAdd = data.map(record => ({
      userId: userEmailMap.get(record.userEmail)!,
      date: record.date,
      usage: parseInt(record.usage, 10),
    })).filter(entry => entry.userId); // Filter out records where user wasn't found

    const { added, updated } = await bulkAddUsageEntries(entriesToAdd, mode, company?.defaultUnit || 'gallons');
    
    console.log(`Upload complete. Added: ${added}, Updated: ${updated}`);
    toast({
      title: "Upload Successful",
      description: `${added} new records added. ${updated} records updated.`,
    });
    // Refresh data after upload
    fetchAndSetData();
  }
  
  const unitLabel = getUnitLabel();
  const displayedData = showAll ? allUsageData : allUsageData.slice(0, 20);

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Usage Data</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
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
            <Card>
                <CardHeader>
                    <CardTitle>Historical Usage Data</CardTitle>
                    <CardDescription>
                        A log of all recorded water usage entries for your company.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="max-h-96 overflow-auto">
                        <Table>
                        <TableHeader className="sticky top-0 bg-background">
                            <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Usage ({unitLabel})</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center">
                                Loading usage data...
                                </TableCell>
                            </TableRow>
                            ) : displayedData.length > 0 ? (
                                displayedData.map((entry) => (
                                <TableRow key={entry.id}>
                                    <TableCell className="font-medium">{userMap.get(entry.userId) || 'Unknown User'}</TableCell>
                                    <TableCell>{entry.date}</TableCell>
                                    <TableCell className="text-right">{convertUsage(entry.usage).toLocaleString(undefined, {maximumFractionDigits: 2})}</TableCell>
                                </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center">
                                        No usage data found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                        </Table>
                    </div>
                     {allUsageData.length > 20 && (
                        <div className="text-center mt-4">
                            <Button variant="outline" onClick={() => setShowAll(!showAll)}>
                                {showAll ? 'Show Less' : `Show All ${allUsageData.length} Entries`}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </AppLayout>
  );
}
