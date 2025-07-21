
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
import type { Allocation, User } from "@/lib/data";
import { addAllocation, updateAllocation, deleteAllocation, getAllocationsByCompany, getUsersByCompany, getUserById } from "@/lib/data";
import { sendAllocationNotificationEmail } from "@/lib/actions";
import { PlusCircle, MoreHorizontal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function AllocationPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [companyUsers, setCompanyUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<Allocation | undefined>(undefined);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [allocationToDelete, setAllocationToDelete] = useState<Allocation | null>(null);

  const userMap = new Map(companyUsers.map(u => [u.id, u.name]));
  userMap.set('all', 'All Users');

  const fetchAndSetData = async () => {
    if (!currentUser?.companyId) return;
    setLoading(true);
    const [allocs, users] = await Promise.all([
      getAllocationsByCompany(currentUser.companyId),
      getUsersByCompany(currentUser.companyId),
    ]);
    setAllocations(allocs.sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
    setCompanyUsers(users);
    setLoading(false);
  };
  
  useEffect(() => {
    if (currentUser?.companyId) {
        fetchAndSetData();
    }
  }, [currentUser]);

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
    if (!allocationToDelete) return;
    await deleteAllocation(allocationToDelete.id);
    toast({
      title: "Allocation Deleted",
      description: "The allocation has been successfully removed.",
    });
    fetchAndSetData();
    setIsDeleteDialogOpen(false);
    setAllocationToDelete(null);
  };

  const handleFormSubmit = async (data: Omit<Allocation, 'id' | 'companyId'>) => {
    if (!currentUser?.companyId) return;
    
    let savedAllocation;
    if (editingAllocation) {
      savedAllocation = await updateAllocation({ ...data, id: editingAllocation.id, companyId: currentUser.companyId });
      toast({
        title: "Allocation Updated",
        description: "The allocation has been successfully saved.",
      });
    } else {
      savedAllocation = await addAllocation({ ...data, companyId: currentUser.companyId });
      toast({
        title: "Allocation Created",
        description: "The new water allocation has been successfully saved.",
      });
    }

    // Send notification
    try {
        let recipients: User[] = [];
        if (savedAllocation.userId) {
            const user = await getUserById(savedAllocation.userId);
            if (user) recipients.push(user);
        } else {
            recipients = await getUsersByCompany(currentUser.companyId);
        }
        
        if (recipients.length > 0) {
            await sendAllocationNotificationEmail(savedAllocation, recipients, editingAllocation ? 'updated' : 'created');
            toast({
                title: "Notifications Sent",
                description: `Sent allocation notifications to ${recipients.length} user(s).`
            });
        }
    } catch (e) {
        console.error("Failed to send notification email:", e);
        toast({
            variant: "destructive",
            title: "Notification Error",
            description: "Could not send allocation notifications. Please check the logs."
        })
    }


    setIsFormOpen(false);
    setEditingAllocation(undefined);
    fetchAndSetData(); // Refresh the list
  };

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
                  <TableHead>Allocation (Gallons)</TableHead>
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
                      <TableCell className="font-medium">{userMap.get(alloc.userId || 'all')}</TableCell>
                      <TableCell>{format(new Date(alloc.startDate), 'P p')} - {format(new Date(alloc.endDate), 'P p')}</TableCell>
                      <TableCell>{alloc.gallons.toLocaleString()}</TableCell>
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
