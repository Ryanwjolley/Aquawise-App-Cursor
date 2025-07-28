
"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { BellRing, Mail, Droplets, Users, PlusCircle, Trash2, MoreHorizontal, ClipboardList } from "lucide-react";
import { NotificationsSetup } from "@/components/dashboard/NotificationsSetup";
import { useToast } from "@/hooks/use-toast";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { updateCompany, getGroupsByCompany, addGroup, updateGroup, deleteGroup, updateUser, User } from "@/lib/data";
import type { Unit, UserGroup } from "@/lib/data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";


// --- Zod Schemas ---
const displaySettingsSchema = z.object({
  defaultUnit: z.enum(["gallons", "kgal", "acre-feet", "cubic-feet"]),
  userGroupsEnabled: z.boolean().default(false),
  waterOrdersEnabled: z.boolean().default(true),
});
type DisplaySettingsFormValues = z.infer<typeof displaySettingsSchema>;

const groupFormSchema = z.object({
    name: z.string().min(2, { message: "Group name must be at least 2 characters." }),
});
type GroupFormValues = z.infer<typeof groupFormSchema>;

const userSettingsSchema = z.object({
  notificationPreference: z.enum(["email", "mobile"], {
    required_error: "Please select a notification preference.",
  }),
});
type UserSettingsFormValues = z.infer<typeof userSettingsSchema>;


export default function SettingsPage() {
  const { toast } = useToast();
  const { company, reloadCompany, currentUser } = useAuth();
  
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isGroupFormOpen, setIsGroupFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<UserGroup | undefined>(undefined);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<UserGroup | null>(null);

  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);

  const isAdmin = currentUser?.role?.includes('Admin') ?? false;

  // --- React Hook Form Instances ---
  const { 
    control: displayControl, 
    handleSubmit: handleDisplaySubmit, 
    reset: resetDisplayForm,
    watch: watchDisplayForm,
    formState: { isSubmitting: isDisplaySubmitting, isDirty: isDisplayDirty }
  } = useForm<DisplaySettingsFormValues>({
    resolver: zodResolver(displaySettingsSchema),
    defaultValues: {
      defaultUnit: company?.defaultUnit || 'gallons',
      userGroupsEnabled: company?.userGroupsEnabled || false,
      waterOrdersEnabled: company?.waterOrdersEnabled || true,
    }
  });
  
   const { 
    control: groupControl, 
    handleSubmit: handleGroupSubmit, 
    reset: resetGroupForm,
    formState: { errors: groupErrors }
  } = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
  });

  const {
    control: userSettingsControl,
    handleSubmit: handleUserSettingsSubmit,
    reset: resetUserSettingsForm,
    formState: { isSubmitting: isUserSettingsSubmitting, errors: userSettingsErrors },
  } = useForm<UserSettingsFormValues>({
    resolver: zodResolver(userSettingsSchema),
  });
  
  const userGroupsEnabled = watchDisplayForm("userGroupsEnabled");


  const fetchUserGroups = async () => {
      if (!company) return;
      setLoadingGroups(true);
      const groups = await getGroupsByCompany(company.id);
      setUserGroups(groups);
      setLoadingGroups(false);
  };

  useEffect(() => {
    if (company && isAdmin) {
      resetDisplayForm({ 
          defaultUnit: company.defaultUnit || 'gallons',
          userGroupsEnabled: company.userGroupsEnabled || false,
          waterOrdersEnabled: company.waterOrdersEnabled ?? true,
      });
      if(company.userGroupsEnabled) {
        fetchUserGroups();
      }
    }
     if (currentUser) {
      resetUserSettingsForm({
        notificationPreference: currentUser.notificationPreference,
      });
    }
  }, [company, currentUser, isAdmin, resetDisplayForm, resetUserSettingsForm]);

  useEffect(() => {
    if(userGroupsEnabled && isAdmin) {
        fetchUserGroups();
    }
  }, [userGroupsEnabled, isAdmin]);

  // --- Handlers ---
  const handleNotificationsSave = (data: any) => {
    console.log("Saving notification settings:", data);
    toast({
      title: "Settings Saved",
      description: "Your notification preferences have been updated.",
    });
    setIsNotificationsOpen(false);
  };
  
  const onDisplaySettingsSubmit = async (data: DisplaySettingsFormValues) => {
    if (!company) return;
    
    try {
        await updateCompany({ ...company, ...data });
        toast({
            title: "Settings Saved",
            description: "Display settings have been updated.",
        });
        await reloadCompany();
        resetDisplayForm(data); // Resets the dirty state after successful save
    } catch (e) {
        console.error("Failed to save display settings:", e);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to save display settings."
        })
    }
  }
  
  const onUserSettingsSubmit = async (data: UserSettingsFormValues) => {
    if (!currentUser) return;
    try {
      const updatedUserData: User = {
        ...currentUser,
        notificationPreference: data.notificationPreference,
      };
      await updateUser(updatedUserData);
      toast({
        title: "Preferences Saved",
        description: "Your notification preferences have been updated.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save your settings. Please try again.",
      });
    }
  };

  // --- Group Management Handlers ---
  const handleAddGroup = () => {
    setEditingGroup(undefined);
    resetGroupForm({ name: '' });
    setIsGroupFormOpen(true);
  };
  
  const handleEditGroup = (group: UserGroup) => {
    setEditingGroup(group);
    resetGroupForm({ name: group.name });
    setIsGroupFormOpen(true);
  }

  const handleDeleteRequest = (group: UserGroup) => {
    setGroupToDelete(group);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!groupToDelete) return;
    await deleteGroup(groupToDelete.id);
    toast({
      title: "Group Deleted",
      description: `${groupToDelete.name} has been removed.`,
    });
    fetchUserGroups();
    setIsDeleteDialogOpen(false);
    setGroupToDelete(null);
  };

  const onGroupFormSubmit = async (data: GroupFormValues) => {
    if (!currentUser?.companyId) return;
    
    if (editingGroup) {
      await updateGroup({ ...data, id: editingGroup.id, companyId: currentUser.companyId });
      toast({
        title: "Group Updated",
        description: "The group's details have been saved.",
      });
    } else {
      await addGroup({ ...data, companyId: currentUser.companyId });
      toast({
        title: "Group Added",
        description: "The new group has been created.",
      });
    }

    setIsGroupFormOpen(false);
    setEditingGroup(undefined);
    fetchUserGroups();
  };


  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        </div>
        <div className="grid gap-6">
            <form onSubmit={handleUserSettingsSubmit(onUserSettingsSubmit)}>
                <Card>
                    <CardHeader>
                    <CardTitle>My Notification Preferences</CardTitle>
                    <CardDescription>
                        Choose how you would like to receive important alerts about your water usage.
                    </CardDescription>
                    </CardHeader>
                    <CardContent>
                    <Controller
                        name="notificationPreference"
                        control={userSettingsControl}
                        render={({ field }) => (
                        <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="grid gap-4"
                        >
                            <Label className="flex items-center gap-4 rounded-md border p-4 cursor-pointer hover:bg-accent has-[[data-state=checked]]:border-primary">
                                <RadioGroupItem value="email" id="email" />
                                <div>
                                    <p className="font-semibold">Email</p>
                                    <p className="text-sm text-muted-foreground">
                                        Send notifications to your email address: {currentUser?.email}
                                    </p>
                                </div>
                            </Label>
                            <Label className={`flex items-center gap-4 rounded-md border p-4 cursor-pointer hover:bg-accent has-[[data-state=checked]]:border-primary ${!currentUser?.mobileNumber ? 'cursor-not-allowed opacity-50' : ''}`}>
                            <RadioGroupItem value="mobile" id="mobile" disabled={!currentUser?.mobileNumber} />
                                <div>
                                    <p className="font-semibold">Text Message (SMS)</p>
                                    <p className="text-sm text-muted-foreground">
                                        {currentUser?.mobileNumber
                                        ? `Send notifications to your mobile number: ${currentUser.mobileNumber}`
                                        : "No mobile number on file. Please contact an admin to add one."}
                                    </p>
                                </div>
                            </Label>
                        </RadioGroup>
                        )}
                    />
                    {userSettingsErrors.notificationPreference && (
                        <p className="text-sm text-destructive pt-4">{userSettingsErrors.notificationPreference.message}</p>
                    )}
                    </CardContent>
                     <CardFooter className="border-t px-6 py-4">
                        <Button type="submit" disabled={isUserSettingsSubmitting}>
                            {isUserSettingsSubmitting ? "Saving..." : "Save Preferences"}
                        </Button>
                    </CardFooter>
                </Card>
            </form>
            
            {isAdmin && (
            <>
                <form onSubmit={handleDisplaySubmit(onDisplaySettingsSubmit)}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Company Settings</CardTitle>
                            <CardDescription>
                                Configure system-wide preferences and feature flags for the entire company.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            <div className="grid gap-2 max-w-sm">
                                <Label htmlFor="defaultUnit">Default Reporting Unit</Label>
                                <Controller
                                    name="defaultUnit"
                                    control={displayControl}
                                    render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger id="defaultUnit">
                                            <SelectValue placeholder="Select a unit" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="gallons">Gallons</SelectItem>
                                            <SelectItem value="kgal">kGal (Thousands)</SelectItem>
                                            <SelectItem value="acre-feet">Acre-Feet</SelectItem>
                                            <SelectItem value="cubic-feet">Cubic Feet</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    )}
                                />
                            </div>
                            <div className="flex items-center space-x-2">
                                <Controller
                                    name="waterOrdersEnabled"
                                    control={displayControl}
                                    render={({ field }) => (
                                        <Switch
                                            id="water-orders-enabled"
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    )}
                                />
                                <div className="grid gap-1.5">
                                    <Label htmlFor="water-orders-enabled">Enable Water Orders Feature</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Allows users to request water orders and enables the system calendar.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Controller
                                    name="userGroupsEnabled"
                                    control={displayControl}
                                    render={({ field }) => (
                                        <Switch
                                            id="user-groups-enabled"
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    )}
                                />
                                 <div className="grid gap-1.5">
                                    <Label htmlFor="user-groups-enabled">Enable User Groups Feature</Label>
                                    <p className="text-xs text-muted-foreground">
                                       Allows users to be organized into groups for reporting and allocations.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="border-t px-6 py-4">
                            <Button type="submit" disabled={isDisplaySubmitting || !isDisplayDirty}>Save Settings</Button>
                        </CardFooter>
                    </Card>
                </form>

                {userGroupsEnabled && (
                    <Card>
                        <CardHeader>
                            <CardTitle>User Groups</CardTitle>
                            <CardDescription>
                                Organize users into groups for easier allocation and reporting.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                            <TableHeader>
                                <TableRow>
                                <TableHead>Group Name</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingGroups ? (
                                <TableRow>
                                    <TableCell colSpan={2} className="text-center">
                                    Loading groups...
                                    </TableCell>
                                </TableRow>
                                ) : userGroups.length > 0 ? (
                                userGroups.map((group) => (
                                    <TableRow key={group.id}>
                                    <TableCell className="font-medium">{group.name}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                            <DropdownMenuItem onClick={() => handleEditGroup(group)}>
                                                Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleDeleteRequest(group)} className="text-destructive">
                                                Delete
                                            </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                    </TableRow>
                                ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center">
                                            No user groups created yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                            </Table>
                        </CardContent>
                        <CardFooter className="border-t px-6 py-4">
                            <Button onClick={handleAddGroup}>
                                <PlusCircle className="mr-2 h-4 w-4"/>
                                Add Group
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>Company Notifications</CardTitle>
                        <CardDescription>
                            Manage how you and your team are notified about water usage.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0">
                                <BellRing className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <div className="flex-grow">
                                <h3 className="text-lg font-medium">Usage Alerts</h3>
                                <p className="text-sm text-muted-foreground">
                                    Set up automated email alerts for important usage events like exceeding allocation thresholds or detecting unusual spikes in consumption.
                                </p>
                            </div>
                            <div className="flex-shrink-0">
                                <Button onClick={() => setIsNotificationsOpen(true)}>
                                    Configure
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Integrations</CardTitle>
                        <CardDescription>
                            Connect AquaWise to other services (coming soon).
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0">
                                <Mail className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <div className="flex-grow">
                                <h3 className="text-lg font-medium">Email Reports</h3>
                                <p className="text-sm text-muted-foreground">
                                    Configure weekly or monthly summary reports to be sent to stakeholders.
                                </p>
                            </div>
                            <div className="flex-shrink-0">
                                <Button variant="secondary" disabled>
                                    Configure
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </>
            )}
        </div>
      </div>
      <NotificationsSetup
        isOpen={isNotificationsOpen}
        onOpenChange={setIsNotificationsOpen}
        onSave={handleNotificationsSave}
      />
      <Sheet open={isGroupFormOpen} onOpenChange={setIsGroupFormOpen}>
        <SheetContent>
            <form onSubmit={handleGroupSubmit(onGroupFormSubmit)}>
                <SheetHeader>
                    <SheetTitle>{editingGroup ? 'Edit Group' : 'Add New Group'}</SheetTitle>
                    <SheetDescription>
                        {editingGroup ? 'Update the name of this user group.' : 'Create a new group to organize your users.'}
                    </SheetDescription>
                </SheetHeader>
                <div className="py-4">
                    <Label htmlFor="name">Group Name</Label>
                    <Controller
                        name="name"
                        control={groupControl}
                        render={({ field }) => <Input id="name" {...field} />}
                    />
                    {groupErrors.name && (
                        <p className="text-sm text-destructive pt-2">{groupErrors.name.message}</p>
                    )}
                </div>
                <SheetFooter>
                    <SheetClose asChild>
                        <Button type="button" variant="outline">Cancel</Button>
                    </SheetClose>
                    <Button type="submit">Save Group</Button>
                </SheetFooter>
            </form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the group {groupToDelete?.name} and unassign all users from it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setGroupToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </AppLayout>
  );
}
