
"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { User } from "@/lib/data";

interface UserSelectorProps {
    users: User[];
    onUserChange: (userId: string) => void;
    showAllOption?: boolean;
    triggerLabel?: string;
    className?: string;
}

export function UserSelector({ 
    users, 
    onUserChange, 
    showAllOption = true,
    triggerLabel = "Select a user",
    className
}: UserSelectorProps) {

  return (
      <Select onValueChange={onUserChange}>
        <SelectTrigger className={className || "w-[240px]"}>
          <SelectValue placeholder={triggerLabel} />
        </SelectTrigger>
        <SelectContent>
          {showAllOption && <SelectItem value="all">All Users</SelectItem>}
          {users.map(user => (
            <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
  );
}
