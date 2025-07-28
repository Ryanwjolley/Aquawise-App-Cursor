
"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import type { User, UserGroup } from "@/lib/data";

interface UserSelectorProps {
    users: User[];
    userGroups?: UserGroup[];
    onUserChange: (userId: string) => void;
    showAllOption?: boolean;
    defaultValue?: string;
    triggerLabel?: string;
    className?: string;
}

export function UserSelector({ 
    users, 
    userGroups = [],
    onUserChange, 
    showAllOption = true,
    defaultValue,
    triggerLabel = "Select a user",
    className
}: UserSelectorProps) {

  return (
      <Select onValueChange={onUserChange} defaultValue={defaultValue}>
        <SelectTrigger className={className || "w-[240px]"}>
          <SelectValue placeholder={triggerLabel} />
        </SelectTrigger>
        <SelectContent>
            {showAllOption && <SelectItem value="all">All Users</SelectItem>}
            {userGroups.length > 0 && (
                <SelectGroup>
                    <SelectLabel>Groups</SelectLabel>
                    {userGroups.map(group => (
                        <SelectItem key={group.id} value={`group_${group.id}`}>
                            {group.name}
                        </SelectItem>
                    ))}
                </SelectGroup>
            )}
             <SelectGroup>
                <SelectLabel>Users</SelectLabel>
                {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                ))}
             </SelectGroup>
        </SelectContent>
      </Select>
  );
}
