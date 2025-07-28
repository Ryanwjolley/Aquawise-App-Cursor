
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
import { UserForm } from "@/components/dashboard/UserForm";
import { useAuth } from "@/contexts/AuthContext";
import type { User, UserGroup } from "@/lib/data";
import { addUser, updateUser, deleteUser, getUsersByCompany, getGroupsByCompany } from "@/lib/data";
import { PlusCircle, MoreHorizontal, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function UserManagementPage() {
  const { currentUser, impersonateUser, company } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>(undefined);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const groupMap = new Map(groups.map(g => [g.id, g.name]));

  const fetchUsersAndGroups = async () => {
    if (!currentUser?.companyId) return;
    setLoading(true);
    const userList = await getUsersByCompany(currentUser.companyId);
    setUsers(userList);

    if (company?.userGroupsEnabled) {
      const groupList = await getGroupsByCompany(currentUser.companyId);
      setGroups(groupList);
    } else {
      setGroups([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (currentUser?.companyId) {
        fetchUsersAndGroups();
    }
  }, [currentUser, company]);

  const handleAddUser = () => {
    setEditingUser(undefined);
    setIsFormOpen(true);
  };
  
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsFormOpen(true);
  }

  const handleDeleteRequest = (user: User) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const handleImpersonate = async (userId: string) => {
    await impersonateUser(userId);
  }

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    await deleteUser(userToDelete.id);
    toast({
      title: "User Deleted",
      description: `${userToDelete.name} has been successfully removed.`,
    });
    fetchUsersAndGroups();
    setIsDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  const handleFormSubmit = async (data: Omit<User, 'id' | 'companyId' | 'role'> & { role: 'Admin' | 'Customer' | 'Admin & Customer' }) => {
    if (!currentUser?.companyId) return;
    
    const userData = { ...data };

    if (editingUser) {
      await updateUser({ ...userData, id: editingUser.id, companyId: editingUser.companyId, role: editingUser.role });
      toast({
        title: "User Updated",
        description: "The user's details have been successfully saved.",
      });
    } else {
      await addUser({ ...userData, companyId: currentUser.companyId });
      toast({
        title: "User Added",
        description: "The new user has been successfully created.",
      });
    }

    setIsFormOpen(false);
    setEditingUser(undefined);
    fetchUsersAndGroups(); // Refresh the user list
  };

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
          <div className="flex items-center space-x-2">
            <Button onClick={handleAddUser}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Company Users</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  {company?.userGroupsEnabled && <TableHead>Group</TableHead>}
                  <TableHead>Mobile</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Shares</TableHead>
                  <TableHead>Notification</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={company?.userGroupsEnabled ? 8 : 7} className="text-center">
                      Loading users...
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      {company?.userGroupsEnabled && <TableCell>{user.userGroupId ? groupMap.get(user.userGroupId) : 'N/A'}</TableCell>}
                      <TableCell>{user.mobileNumber || 'N/A'}</TableCell>
                      <TableCell>{user.role}</TableCell>
                      <TableCell>{user.shares ?? 0}</TableCell>
                      <TableCell className="capitalize">{user.notificationPreference}</TableCell>
                      <TableCell className="text-right">
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" disabled={user.id === currentUser?.id}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => handleImpersonate(user.id)}>
                                <LogIn className="mr-2 h-4 w-4"/>
                                Impersonate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteRequest(user)} className="text-destructive">
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <UserForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
        defaultValues={editingUser}
        userGroups={groups}
      />

       <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user {userToDelete?.name} and all their associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </AppLayout>
  );
}
