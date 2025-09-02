
"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AllocationForm } from "@/components/dashboard/AllocationForm";
import { useAuth } from "@/contexts/AuthContext";
import type { Allocation, User, UserGroup } from "@/lib/data";
import { getUsersByCompanyFS, getGroupsByCompanyFS } from "@/lib/firestoreClientUsers";
import { getAllocationsByCompanyFS } from "@/lib/firestoreAllocations";
import { addAllocationAction, updateAllocationAction, deleteAllocationAction } from "./actions";
import { getUnitLabel as getUnitLabelFromData, CONVERSION_FACTORS_FROM_GALLONS } from "@/lib/data";
import { sendAllocationNotificationEmail } from "@/lib/actions";
import { PlusCircle, MoreHorizontal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, formatISO } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useUnit } from "@/contexts/UnitContext";

export default function AllocationPage() {
  const { currentUser, company } = useAuth();
  const { convertUsage, getUnitLabel } = useUnit();
  const { toast } = useToast();
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [companyUsers, setCompanyUsers] = useState<User[]>([]);
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<Allocation | undefined>(undefined);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [allocationToDelete, setAllocationToDelete] = useState<Allocation | null>(null);

  // In a real app, this would be fetched from the database
  const notificationSettings = { allocationChangeAlerts: { enabled: true } };

  const userMap = new Map(companyUsers.map(u => [u.id, u.name]));
  userMap.set('all', 'All Users');
  const groupMap = new Map(userGroups.map(g => [g.id, g.name]));


  const fetchAndSetData = async () => {
    if (!currentUser?.companyId) return;
    setLoading(true);
    let requests: [Promise<Allocation[]>, Promise<User[]>, Promise<UserGroup[]>?] = [
      getAllocationsByCompanyFS(currentUser.companyId),
      getUsersByCompanyFS(currentUser.companyId),
    ];
    if (company?.userGroupsEnabled) {
        requests.push(getGroupsByCompanyFS(currentUser.companyId));
    }
    
    const [allocs, users, groups] = await Promise.all(requests);
    
    setAllocations(allocs.sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
    setCompanyUsers(users);
    setUserGroups(groups || []);

    setLoading(false);
  };
  
  useEffect(() => {
    if (currentUser?.companyId) {
        fetchAndSetData();
    }
  }, [currentUser, company]);

  const handleNewAllocation = () => {
    setEditingAllocation(undefined);
    setIsFormOpen(true);
  };
  
  const handleEditAllocation = (allocation: Allocation) => {
    setEditingAllocation(allocation);
    setIsFormOpen(true);
  }

  const handleDeleteRequest = (allocation: Allocation) => {
    setAllocationToDelete(allocation);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
  if (!allocationToDelete || !currentUser) return;
  await deleteAllocationAction(currentUser.companyId, allocationToDelete.id, currentUser.id);
    toast({
      title: "Allocation Deleted",
      description: "The allocation has been successfully removed.",
    });
    fetchAndSetData();
    setIsDeleteDialogOpen(false);
    setAllocationToDelete(null);
  };

  const handleFormSubmit = async (data: Omit<Allocation, 'id' | 'companyId'>) => {
    if (!currentUser?.companyId || !company) return;

    const updateType = editingAllocation ? 'updated' : 'created';
    let savedAllocation: Allocation;

    if (editingAllocation) {
        await updateAllocationAction(currentUser.companyId, editingAllocation.id, data as any, currentUser.id);
        savedAllocation = { ...data, id: editingAllocation.id, companyId: currentUser.companyId } as Allocation;
    } else {
        const created = await addAllocationAction(currentUser.companyId, data, currentUser.id);
        savedAllocation = { ...data, id: created.id, companyId: currentUser.companyId } as Allocation;
    }

    toast({
        title: `Allocation ${updateType}`,
        description: `The allocation has been successfully ${updateType}.`,
    });

    // Re-fetch users to ensure we have the latest list for notifications
    const allUsers = await getUsersByCompanyFS(currentUser.companyId);
    let recipients: User[] = [];

    // Determine recipients
    if (savedAllocation.userId) {
        const user = allUsers.find(u => u.id === savedAllocation.userId);
        if (user) recipients.push(user);
    } else if (savedAllocation.userGroupId) {
        recipients = allUsers.filter(u => u.userGroupId === savedAllocation.userGroupId);
    } else {
        recipients = allUsers;
    }

    // --- Send Notifications ---
    if (notificationSettings.allocationChangeAlerts.enabled && recipients.length > 0) {
        try {
            // Send email
            await sendAllocationNotificationEmail(savedAllocation, recipients, updateType, company.defaultUnit);
            
            // Add in-app notification
            const unitKey = company.defaultUnit as keyof typeof CONVERSION_FACTORS_FROM_GALLONS;
            const unitLabel = getUnitLabelFromData(unitKey);
            const convertedAmount = savedAllocation.gallons * (CONVERSION_FACTORS_FROM_GALLONS[unitKey] || 1);
            const formattedStart = format(new Date(savedAllocation.startDate), 'P');
            const formattedEnd = format(new Date(savedAllocation.endDate), 'P');

            const message = `Your water allocation has been ${updateType}. The new allocation of ${convertedAmount.toLocaleString()} ${unitLabel} is valid from ${formattedStart} to ${formattedEnd}.`;
            
            const details = `<p>Hello,</p>
            <p>Your water allocation has been ${updateType}. Here are the details:</p>
            <ul>
                <li><strong>Period:</strong> ${format(new Date(savedAllocation.startDate), 'P p')} to ${format(new Date(savedAllocation.endDate), 'P p')}</li>
                <li><strong>Allocated Amount:</strong> ${convertedAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unitLabel}</li>
            </ul>
            <p>You can view your usage and allocation details by logging into the AquaWise dashboard.</p>`;

            // Persist in-app notifications in Firestore
            // Build notification payloads and send via server API route to avoid importing server code in client bundle
            const notificationsPayload = recipients.map(recipient => {
              const dashboardPath = recipient.role.includes('Admin') ? '/admin' : '/';
              const link = `${dashboardPath}?from=${savedAllocation.startDate}&to=${savedAllocation.endDate}`;
              return {
                userId: recipient.id,
                message,
                details,
                link,
              };
            });
            await fetch('/api/notifications/add', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ companyId: currentUser.companyId, notifications: notificationsPayload }),
            });
            
            toast({
                title: "Notifications Sent",
                description: `Sent allocation notifications to ${recipients.length} user(s).`
            });
        } catch (e) {
            console.error("Failed to send notification email:", e);
            toast({
                variant: "destructive",
                title: "Notification Error",
                description: "Could not send allocation notifications. Please check the logs."
            })
        }
    }
    
    // --- Re-check for threshold alerts after allocation change ---
  // Coming soon: re-check alert thresholds server-side

    setIsFormOpen(false);
    setEditingAllocation(undefined);
    fetchAndSetData(); // Refresh the list
  };
  
  const getAppliesToName = (alloc: Allocation): string => {
    if (alloc.userId) {
        return userMap.get(alloc.userId) ?? 'Unknown User';
    }
    if (alloc.userGroupId) {
        return groupMap.get(alloc.userGroupId) ?? 'Unknown Group';
    }
    return 'All Users';
  }

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Allocations</h2>
          <div className="flex items-center space-x-2">
            <Button onClick={handleNewAllocation}>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Allocation
            </Button>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Company Allocations</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applies To</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Allocation ({getUnitLabel()})</TableHead>
                   <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      Loading allocations...
                    </TableCell>
                  </TableRow>
                ) : allocations.length > 0 ? (
                  allocations.map((alloc) => (
                    <TableRow key={alloc.id}>
                      <TableCell className="font-medium">{getAppliesToName(alloc)}</TableCell>
                      <TableCell>{format(new Date(alloc.startDate), 'P p')} - {format(new Date(alloc.endDate), 'P p')}</TableCell>
                      <TableCell>{convertUsage(alloc.gallons).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => handleEditAllocation(alloc)}>
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteRequest(alloc)} className="text-destructive">
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={4} className="text-center">
                            No allocations found.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <AllocationForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
        companyUsers={companyUsers}
        userGroups={userGroups}
        existingAllocations={allocations}
        defaultValues={editingAllocation}
      />

       <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this allocation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAllocationToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </AppLayout>
  );
}
