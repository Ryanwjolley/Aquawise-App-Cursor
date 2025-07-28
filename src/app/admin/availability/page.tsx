
"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AvailabilityForm } from "@/components/dashboard/AvailabilityForm";
import { useAuth } from "@/contexts/AuthContext";
import type { WaterAvailability } from "@/lib/data";
import { addWaterAvailability, updateWaterAvailability, deleteWaterAvailability, getWaterAvailabilities } from "@/lib/data";
import { PlusCircle, MoreHorizontal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useUnit } from "@/contexts/UnitContext";

export default function AvailabilityPage() {
  const { currentUser } = useAuth();
  const { convertUsage, getUnitLabel } = useUnit();
  const { toast } = useToast();
  const [availabilities, setAvailabilities] = useState<WaterAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAvailability, setEditingAvailability] = useState<WaterAvailability | undefined>(undefined);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [availabilityToDelete, setAvailabilityToDelete] = useState<WaterAvailability | null>(null);

  const fetchAndSetData = async () => {
    if (!currentUser?.companyId) return;
    setLoading(true);
    const avails = await getWaterAvailabilities(currentUser.companyId);
    setAvailabilities(avails.sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
    setLoading(false);
  };
  
  useEffect(() => {
    if (currentUser?.companyId) {
        fetchAndSetData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const handleNewAvailability = () => {
    setEditingAvailability(undefined);
    setIsFormOpen(true);
  };
  
  const handleEditAvailability = (availability: WaterAvailability) => {
    setEditingAvailability(availability);
    setIsFormOpen(true);
  }

  const handleDeleteRequest = (availability: WaterAvailability) => {
    setAvailabilityToDelete(availability);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!availabilityToDelete) return;
    await deleteWaterAvailability(availabilityToDelete.id);
    toast({
      title: "Availability Deleted",
      description: "The availability period has been successfully removed.",
    });
    fetchAndSetData();
    setIsDeleteDialogOpen(false);
    setAvailabilityToDelete(null);
  };

  const handleFormSubmit = async (data: Omit<WaterAvailability, 'id' | 'companyId'>) => {
    if (!currentUser?.companyId) return;
    
    if (editingAvailability) {
      await updateWaterAvailability({ ...data, id: editingAvailability.id, companyId: currentUser.companyId });
      toast({
        title: "Availability Updated",
        description: "The availability period has been successfully saved.",
      });
    } else {
      await addWaterAvailability({ ...data, companyId: currentUser.companyId });
      toast({
        title: "Availability Created",
        description: "The new water availability has been successfully saved.",
      });
    }

    setIsFormOpen(false);
    setEditingAvailability(undefined);
    fetchAndSetData(); // Refresh the list
  };

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">System Availability</h2>
          <div className="flex items-center space-x-2">
            <Button onClick={handleNewAvailability}>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Availability
            </Button>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Water Availability Periods</CardTitle>
            <CardDescription>Define how much total water is available in the system for users to order against for a given time period.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Total Available ({getUnitLabel()})</TableHead>
                   <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : availabilities.length > 0 ? (
                  availabilities.map((avail) => (
                    <TableRow key={avail.id}>
                      <TableCell className="font-medium">{format(new Date(avail.startDate), 'P p')} - {format(new Date(avail.endDate), 'P p')}</TableCell>
                      <TableCell>{convertUsage(avail.gallons).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => handleEditAvailability(avail)}>
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteRequest(avail)} className="text-destructive">
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={3} className="text-center">
                            No availability periods defined.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <AvailabilityForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
        defaultValues={editingAvailability}
      />

       <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this availability period.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAvailabilityToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </AppLayout>
  );
}
