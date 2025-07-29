
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getAllUsers, User } from "@/lib/data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { Label } from "./ui/label";

// This component will only be rendered in development environments
export function DevUserSwitcher() {
  const { switchUser, currentUser } = useAuth();
  const [allUsers, setAllUsers] = useState<User[]>([]);

  useEffect(() => {
    // Only fetch users in development environment
    if (process.env.NODE_ENV === 'development') {
      getAllUsers().then(setAllUsers);
    }
  }, []);

  const handleUserSwitch = (userId: string) => {
    if (userId) {
      switchUser(userId);
    }
  };
  
  // Do not render this component in production
  if (process.env.NODE_ENV !== 'development' || allUsers.length === 0) {
    return null;
  }
  
  const superAdmin = allUsers.find(u => u.role === 'Super Admin');
  const otherUsers = allUsers.filter(u => u.role !== 'Super Admin');

  return (
    <div className="p-2 space-y-2 border-t">
        <Label className="px-1 text-xs font-bold text-muted-foreground uppercase">DEV: Switch User</Label>
        <Select onValueChange={handleUserSwitch} value={currentUser?.id}>
            <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a user" />
            </SelectTrigger>
            <SelectContent>
                 {superAdmin && (
                    <SelectItem key={superAdmin.id} value={superAdmin.id}>
                        {superAdmin.name} (Super Admin)
                    </SelectItem>
                 )}
                <SelectGroup>
                    <SelectLabel>Company Users</SelectLabel>
                    {otherUsers.map(user => (
                        <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                    ))}
                </SelectGroup>
            </SelectContent>
        </Select>
    </div>
  );
}
