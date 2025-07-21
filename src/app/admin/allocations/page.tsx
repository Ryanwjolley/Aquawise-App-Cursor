
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
import { addAllocation, getAllocationsByCompany, getUsersByCompany } from "@/lib/data";
import { PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function AllocationPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [companyUsers, setCompanyUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const userMap = new Map(companyUsers.map(u => [u.id, u.name]));
  userMap.set('all', 'All Users');

  const fetchAndSetData = async () => {
    if (!currentUser?.companyId) return;
    setLoading(true);
    const [allocs, users] = await Promise.all([
      getAllocationsByCompany(currentUser.companyId),
      getUsersByCompany(currentUser.companyId),
    ]);
    setAllocations(allocs);
    setCompanyUsers(users);
    setLoading(false);
  };
  
  useEffect(() => {
    fetchAndSetData();
  }, [currentUser]);

  const handleFormSubmit = async (data: Omit<Allocation, 'id' | 'companyId'>) => {
    if (!currentUser?.companyId) return;

    await addAllocation({ ...data, companyId: currentUser.companyId });
    toast({
      title: "Allocation Created",
      description: "The new water allocation has been successfully saved.",
    });
    setIsFormOpen(false);
    fetchAndSetData(); // Refresh the list
  };

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Allocations</h2>
          <div className="flex items-center space-x-2">
            <Button onClick={() => setIsFormOpen(true)}>
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
                  <TableHead className="text-right">Allocation (Gallons)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center">
                      Loading allocations...
                    </TableCell>
                  </TableRow>
                ) : allocations.length > 0 ? (
                  allocations.map((alloc) => (
                    <TableRow key={alloc.id}>
                      <TableCell className="font-medium">{userMap.get(alloc.userId || 'all')}</TableCell>
                      <TableCell>{format(new Date(alloc.startDate), 'LLL dd, y')} - {format(new Date(alloc.endDate), 'LLL dd, y')}</TableCell>
                      <TableCell className="text-right">{alloc.gallons.toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={3} className="text-center">
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
      />
    </AppLayout>
  );
}
