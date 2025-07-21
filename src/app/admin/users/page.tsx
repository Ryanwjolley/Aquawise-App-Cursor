
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
import type { User } from "@/lib/data";
import { getUsersByCompany } from "@/lib/data"; // We will add a mock addUser function later
import { PlusCircle, MoreHorizontal } from "lucide-react";

export default function UserManagementPage() {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User> | undefined>(undefined);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!currentUser?.companyId) return;
      setLoading(true);
      const userList = await getUsersByCompany(currentUser.companyId);
      setUsers(userList);
      setLoading(false);
    };

    fetchUsers();
  }, [currentUser]);

  const handleAddUser = () => {
    setEditingUser(undefined);
    setIsFormOpen(true);
  };
  
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsFormOpen(true);
  }

  const handleFormSubmit = async (data: any) => {
    // In a real app, you'd call a function to save the user to your database.
    // For now, we'll just log it and refresh the list to simulate.
    console.log("Form submitted", data);
    
    // Mock adding/updating user
    if (editingUser?.id) {
        // "Update" logic
        setUsers(users.map(u => u.id === editingUser.id ? {...u, ...data} : u));
    } else {
        // "Add" logic
        const newUser: User = {
            id: `u${Date.now()}`,
            companyId: currentUser!.companyId,
            ...data
        }
        setUsers([...users, newUser]);
    }

    setIsFormOpen(false); // Close the form
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
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      Loading users...
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.role}</TableCell>
                      <TableCell className="text-right">
                         <Button variant="ghost" size="icon" onClick={() => handleEditUser(user)}>
                            <MoreHorizontal className="h-4 w-4" />
                         </Button>
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
      />
    </AppLayout>
  );
}
