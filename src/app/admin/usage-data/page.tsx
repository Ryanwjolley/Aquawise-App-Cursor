
"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { DataUploadForm } from "@/components/dashboard/DataUploadForm";
import { ManualUsageForm } from "@/components/dashboard/ManualUsageForm";
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
import { User, getUnitLabel, UsageEntry, Unit } from "@/lib/data";
import { getUsersByCompanyFS } from "@/lib/firestoreClientUsers";
import { getCompanyUsageFS, findExistingUsageAction } from "@/lib/firestoreUsage";
import { bulkAddUsageEntriesServer } from "./actions";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useUnit } from "@/contexts/UnitContext";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";


export default function UsageDataPage() {
  const { currentUser, company } = useAuth();
  const { toast } = useToast();
  const { getUnitLabel, convertUsage } = useUnit();
  const [companyUsers, setCompanyUsers] = useState<User[]>([]);
  const [allUsageData, setAllUsageData] = useState<UsageEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  
  const [isConflictDialogOpen, setIsConflictDialogOpen] = useState(false);
  const [conflictingEntries, setConflictingEntries] = useState<Omit<UsageEntry, 'id'>[]>([]);
  const [conflictMode, setConflictMode] = useState<'add' | 'overwrite'>('overwrite');

  const userMap = new Map(companyUsers.map(u => [u.id, u.name]));

  const fetchAndSetData = async () => {
    if (!currentUser?.companyId) return;
    setLoading(true);

    const users = await getUsersByCompanyFS(currentUser.companyId);
    setCompanyUsers(users);

    const companyUsage = await getCompanyUsageFS(currentUser.companyId);
    setAllUsageData(companyUsage);
    setLoading(false);
  }

  useEffect(() => {
    if (currentUser?.companyId) {
      fetchAndSetData();
    }
  }, [currentUser]);

  const handleDataUpload = async (data: any[], mode: 'overwrite' | 'new_only', unit: Unit) => {
    console.log(`Preparing to upload ${data.length} records with mode: ${mode} in unit: ${unit}`);
    
    const userEmailMap = new Map(companyUsers.map(u => [u.email, u.id]));
    
    const entriesToAdd = data.map(record => ({
      userId: userEmailMap.get(record.userEmail)!,
      date: record.date,
      usage: parseInt(record.usage, 10),
    })).filter(entry => entry.userId);

  if (!currentUser) return;
  const { added, updated } = await bulkAddUsageEntriesServer(currentUser.companyId, entriesToAdd, mode, unit);
    
    toast({
      title: "Upload Successful",
      description: `${added} new records added. ${updated} records updated.`,
    });
    fetchAndSetData();
  }

  const handleManualEntry = async (entries: Omit<UsageEntry, 'id'>[]) => {
    // Check for conflicts before submitting
    const entriesToCheck = entries.map(e => ({ userId: e.userId, date: e.date }));
  if (!currentUser) return;
  const duplicates = await findExistingUsageAction(currentUser.companyId, entriesToCheck);

    if (duplicates.length > 0) {
      setConflictingEntries(entries);
      setIsConflictDialogOpen(true);
    } else {
      // No conflicts, proceed directly
      await submitManualEntry(entries, 'add');
    }
  }

  const submitManualEntry = async (entries: Omit<UsageEntry, 'id'>[], mode: 'add' | 'overwrite') => {
  if (!currentUser) return;
  const { added, updated } = await bulkAddUsageEntriesServer(currentUser.companyId, entries, mode);
      toast({
          title: "Manual Entry Successful",
          description: `${added} new records added. ${updated} records updated.`,
      });
      setIsManualEntryOpen(false);
      fetchAndSetData();
  }
  
  const handleConflictConfirm = async () => {
    setIsConflictDialogOpen(false);
    await submitManualEntry(conflictingEntries, conflictMode);
    setConflictingEntries([]);
  }
  
  const unitLabel = getUnitLabel();
  const displayedData = showAll ? allUsageData : allUsageData.slice(0, 20);

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Usage Data</h2>
          <Button onClick={() => setIsManualEntryOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4"/>
            Manual Entry
          </Button>
        </div>
        <div className="grid gap-6">
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
             <Card>
                <CardHeader>
                    <CardTitle>Bulk Upload from CSV</CardTitle>
                    <CardDescription>
                        Upload a CSV file with user water usage. The file should have columns: `userEmail` and `date` (YYYY-MM-DD), and `usage`. Please specify the unit for the `usage` column below.
                        You can <Link href="/test-data.csv" className="underline text-primary" download>download a sample file</Link> to see the required format.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <DataUploadForm onUpload={handleDataUpload} companyUsers={companyUsers} />
                </CardContent>
            </Card>
        </div>
      </div>
      <ManualUsageForm 
        isOpen={isManualEntryOpen}
        onOpenChange={setIsManualEntryOpen}
        onSubmit={handleManualEntry}
        companyUsers={companyUsers}
      />
       <AlertDialog open={isConflictDialogOpen} onOpenChange={setIsConflictDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Existing Data Found</AlertDialogTitle>
            <AlertDialogDescription>
              One or more dates in this entry already have usage data. How would you like to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
            <RadioGroup value={conflictMode} onValueChange={(value: 'add' | 'overwrite') => setConflictMode(value)} className="mt-4 space-y-2">
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="overwrite" id="overwrite" />
                    <Label htmlFor="overwrite">Replace existing data with this new entry.</Label>
                </div>
                    <div className="flex items-center space-x-2">
                    <RadioGroupItem value="add" id="add" />
                    <Label htmlFor="add">Add this amount to the existing data.</Label>
                </div>
            </RadioGroup>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setConflictingEntries([]);
              setIsConflictDialogOpen(false);
            }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConflictConfirm}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
