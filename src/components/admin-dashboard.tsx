
'use client';
import React, {useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CalendarDays, Upload, Edit, UserPlus, Ban, CheckCircle, Trash2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableCell, TableBody } from '@/components/ui/table';
import { getUsageForDateRange, getAllocationForDate, setAllocationForDate, getUsers, updateUser, inviteUser, updateUserStatus, deleteUser, getInvites, deleteInvite, addUsageEntry } from '../firestoreService';
import type { User, Invite } from '../firestoreService';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { UserForm } from './user-form';
import { useAuth } from '@/context/auth-context';
import { Badge } from '@/components/ui/badge';
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
import { Skeleton } from './ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const DEFAULT_TOTAL_ALLOCATION = 5000000;

type UserData = User | Invite;

export default function AdminDashboard() {
    const [totalAllocation, setTotalAllocation] = useState(DEFAULT_TOTAL_ALLOCATION);
    const [userData, setUserData] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [waterDataLoading, setWaterDataLoading] = useState(false);
    const [totalWaterConsumed, setTotalWaterConsumed] = useState(0);
    
    const [isUserFormOpen, setIsUserFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
    const [userToDelete, setUserToDelete] = useState<(User | Invite) | null>(null);
    
    const { toast } = useToast();
    const usageFileInputRef = React.useRef<HTMLInputElement>(null);
    const userFileInputRef = React.useRef<HTMLInputElement>(null);
    const [date, setDate] = useState<DateRange | undefined>({
        from: new Date(2025, 6, 1),
        to: new Date(2025, 6, 31),
    });
    const { user: authUser } = useAuth();
    
    const fetchUserData = useCallback(async () => {
        setLoading(true);
        try {
            const [fetchedUsers, fetchedInvites] = await Promise.all([
                getUsers(),
                getInvites(),
            ]);
            
            const combinedData = [...fetchedUsers, ...fetchedInvites].sort((a, b) => a.name.localeCompare(b.name));
            setUserData(combinedData);

        } catch(error) {
            toast({
                variant: 'destructive',
                title: 'User Data Fetch Failed',
                description: 'Could not load user and invitation list.',
            });
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [toast]);

    const fetchWaterData = useCallback(async (currentUsers: UserData[]) => {
        if (!date?.from) {
            setTotalWaterConsumed(0);
            return;
        }
        const endDate = date.to ?? date.from;
        setWaterDataLoading(true);
        try {
            const activeUsers = currentUsers.filter(u => u.status === 'active') as User[];
            const userIds = activeUsers.map(u => u.id);

            const [allocation, usageDataById] = await Promise.all([
                getAllocationForDate(date.from),
                userIds.length > 0 ? getUsageForDateRange(userIds, date.from, endDate) : Promise.resolve({}),
            ]);
            
            const currentTotalAllocation = allocation ?? DEFAULT_TOTAL_ALLOCATION;
            setTotalAllocation(currentTotalAllocation);

            const consumed = Object.values(usageDataById).reduce((sum, val) => sum + val, 0);
            setTotalWaterConsumed(consumed);

        } catch(error) {
            toast({
                variant: 'destructive',
                title: 'Water Data Fetch Failed',
                description: 'Could not load water data for the selected period.',
            });
            console.error(error);
        } finally {
            setWaterDataLoading(false);
        }
    }, [date, toast]);


    useEffect(() => {
        fetchUserData();
    }, [fetchUserData]);

    const onTabChange = async (tab: string) => {
        if (tab === 'water') {
            // Ensure user data is loaded before fetching water data
            if (userData.length === 0) {
                await fetchUserData();
            }
            fetchWaterData(userData);
        }
    }
    
    const userNameToIdMap = useMemo(() => {
        const registeredUsers = userData.filter(u => u.status !== 'invited') as User[];
        return new Map(registeredUsers.map(u => [u.name, u.id]));
    }, [userData]);
    
    const handleUsageCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.type !== 'text/csv') {
            toast({
                variant: 'destructive',
                title: 'Invalid File Type',
                description: 'Please upload a valid .csv file.',
            });
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result as string;
                const lines = text.split(/\r\n|\n/).slice(1);
                
                const usageEntries = [];
                let updatesMade = 0;

                for (const line of lines) {
                    if (!line.trim()) continue;
                    const [name, usedStr, dateStr] = line.split(',');
                    if (name && usedStr && dateStr) {
                        const trimmedName = name.trim();
                        const used = parseInt(usedStr.trim(), 10);
                        const trimmedDate = dateStr.trim();
                        const userId = userNameToIdMap.get(trimmedName);

                        if (userId && !isNaN(used) && trimmedDate) {
                            usageEntries.push({ userId: userId, consumption: used, date: trimmedDate });
                            updatesMade++;
                        }
                    }
                }
                
                if (updatesMade > 0) {
                    await Promise.all(usageEntries.map(entry => addUsageEntry(entry)));
                    fetchUserData();
                    toast({
                        title: 'Upload Successful',
                        description: `Logged usage for ${updatesMade} user(s). View data by selecting the appropriate date range.`,
                    });
                } else {
                     toast({
                        variant: 'destructive',
                        title: 'No Updates Made',
                        description: 'CSV data did not match any existing users or was invalid. Expected format: name,used,date.',
                    });
                }
            } catch (error) {
                 toast({
                    variant: 'destructive',
                    title: 'Error Processing File',
                    description: 'Could not parse or upload the CSV file. Please check the format and file content.',
                });
                console.error("Error parsing CSV:", error);
            } finally {
                if (usageFileInputRef.current) {
                    usageFileInputRef.current.value = '';
                }
            }
        };
        reader.readAsText(file);
    };

    const handleUserCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.type !== 'text/csv') {
            toast({
                variant: 'destructive',
                title: 'Invalid File Type',
                description: 'Please upload a valid .csv file.',
            });
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result as string;
                const lines = text.split(/\r\n|\n/).slice(1);
                
                const userInvites = [];
                for (const line of lines) {
                    if (!line.trim()) continue;
                    const [name, email, role, sharesStr] = line.split(',');
                    if (name && email && role && sharesStr) {
                        const shares = parseInt(sharesStr.trim(), 10);
                        const trimmedRole = role.trim().toLowerCase();
                        if (!isNaN(shares) && (trimmedRole === 'admin' || trimmedRole === 'customer')) {
                            userInvites.push({ 
                                name: name.trim(), 
                                email: email.trim(), 
                                shares, 
                                role: trimmedRole as 'admin' | 'customer' 
                            });
                        }
                    }
                }
                
                if (userInvites.length > 0) {
                    await Promise.all(userInvites.map(user => inviteUser(user)));
                    fetchUserData();
                    toast({
                        title: 'Upload Successful',
                        description: `Sent invites for ${userInvites.length} user(s).`,
                    });
                } else {
                     toast({
                        variant: 'destructive',
                        title: 'No Invites Sent',
                        description: 'CSV data was invalid or empty. Expected format: name,email,role,shares.',
                    });
                }
            } catch (error) {
                 toast({
                    variant: 'destructive',
                    title: 'Error Processing File',
                    description: 'Could not parse or upload the user CSV file.',
                });
                console.error("Error parsing user CSV:", error);
            } finally {
                if (userFileInputRef.current) {
                    userFileInputRef.current.value = '';
                }
            }
        };
        reader.readAsText(file);
    };

    const handleUpdateAllocation = async () => {
        if (!date?.from || !date?.to) {
            toast({
                variant: 'destructive',
                title: 'Invalid Date Range',
                description: 'Please select a start and end date for the allocation period.',
            });
            return;
        }
        try {
            await setAllocationForDate(date.from, date.to, totalAllocation);
            fetchWaterData(userData);
            toast({
                title: 'Allocation Updated',
                description: `Set total allocation to ${totalAllocation.toLocaleString()} gallons for the selected period.`,
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Update Failed',
                description: 'Could not save the allocation.',
            });
        }
    };
    
    const handleFormSave = async (formData: { name: string; email: string; shares: number; role: 'admin' | 'customer' }) => {
        try {
            if (editingUser && editingUser.status !== 'invited') {
                await updateUser(editingUser.id!, {name: formData.name, shares: formData.shares, role: formData.role});
                toast({ title: 'User Updated', description: `Updated details for ${formData.name}.` });
            } else {
                await inviteUser(formData);
                toast({ title: 'User Invited', description: `An invitation has been created for ${formData.email}.` });
            }
            fetchUserData();
            setEditingUser(null);
        } catch (error) {
            const action = editingUser && editingUser.status !== 'invited' ? 'save' : 'invite';
             toast({
                variant: 'destructive',
                title: `${action.charAt(0).toUpperCase() + action.slice(1)} Failed`,
                description: `Could not ${action} user.`,
            });
        }
    };

    const handleToggleUserStatus = async (userToToggle: User) => {
        if (userToToggle.id === authUser?.uid) {
            toast({
                variant: 'destructive',
                title: 'Action Forbidden',
                description: 'You cannot deactivate your own account.',
            });
            return;
        }

        const newStatus = (userToToggle.status ?? 'active') === 'active' ? 'inactive' : 'active';
        try {
            await updateUserStatus(userToToggle.id, newStatus);
            fetchUserData();
            toast({
                title: 'User Status Updated',
                description: `${userToToggle.name} has been ${newStatus === 'active' ? 'activated' : 'deactivated'}.`,
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Update Failed',
                description: 'Could not update user status.',
            });
        }
    };

    const handleConfirmDelete = async () => {
        if (!userToDelete) return;
    
        try {
            if (userToDelete.status === 'invited') {
                await deleteInvite(userToDelete.id);
                 toast({
                    title: 'Invitation Deleted',
                    description: `The invitation for ${userToDelete.name} has been deleted.`,
                });
            } else {
                await deleteUser(userToDelete.id);
                toast({
                    title: 'User Deleted',
                    description: `${userToDelete.name} has been successfully deleted.`,
                });
            }
            fetchUserData();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Deletion Failed',
                description: error.message || 'Could not perform delete action.',
            });
        } finally {
            setUserToDelete(null);
        }
    };

    const activeUsers = useMemo(() => {
        return userData.filter(u => u.status === 'active');
    }, [userData]);

    const getBadgeVariant = (status?: 'active' | 'inactive' | 'invited') => {
        switch (status) {
            case 'active': return 'secondary';
            case 'inactive': return 'destructive';
            case 'invited': return 'default';
            default: return 'secondary';
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <header className="flex flex-col sm:flex-row justify-between sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Water Master Dashboard</h1>
                    <p className="text-muted-foreground">Manti Irrigation Company</p>
                </div>
                <div className="flex items-center gap-4">
                 <Popover>
                    <PopoverTrigger asChild>
                        <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-auto min-w-[240px] justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                        )}
                        >
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {date?.from ? (
                            date.to ? (
                            <>
                                {format(date.from, "LLL dd, y")} -{" "}
                                {format(date.to, "LLL dd, y")}
                            </>
                            ) : (
                            format(date.from, "LLL dd, y")
                            )
                        ) : (
                            <span>Pick a date range</span>
                        )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={date?.from}
                            selected={date}
                            onSelect={setDate}
                            numberOfMonths={2}
                        />
                    </PopoverContent>
                </Popover>
                </div>
            </header>

            <Tabs defaultValue="users" onValueChange={onTabChange}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="users">User Management</TabsTrigger>
                    <TabsTrigger value="water">Water Management</TabsTrigger>
                </TabsList>
                
                <TabsContent value="users">
                    <Card className="rounded-xl shadow-md overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-xl">User & Invitation Management</CardTitle>
                            </div>
                            <div className='flex items-center gap-2'>
                                <Button variant="outline" onClick={() => { setEditingUser(null); setIsUserFormOpen(true); }}>
                                <UserPlus className="mr-2 h-4 w-4" />
                                Invite User
                                </Button>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="outline" onClick={() => userFileInputRef.current?.click()}>
                                                <Upload className="mr-2 h-4 w-4" />
                                                Upload Users
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Upload a CSV with columns: `name`, `email`, `role`, `shares`.</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                <input
                                    ref={userFileInputRef}
                                    type="file"
                                    id="user-csv-upload"
                                    className="hidden"
                                    accept=".csv"
                                    onChange={handleUserCsvUpload}
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="w-full overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>User</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Shares</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            Array.from({length: 5}).map((_, i) => (
                                                <TableRow key={`skeleton-${i}`}>
                                                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                                    <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                                                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                                                    <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                                                </TableRow>
                                            ))
                                        ) : userData.map((user) => (
                                            <TableRow key={user.id} className={(user.status ?? 'active') === 'inactive' ? 'opacity-50' : ''}>
                                                <TableCell className="font-medium">{user.name}</TableCell>
                                                <TableCell>{user.email}</TableCell>
                                                <TableCell className="capitalize">{user.role}</TableCell>
                                                <TableCell>{user.shares}</TableCell>
                                                <TableCell>
                                                    <Badge variant={getBadgeVariant((user as User).status ?? 'invited')}>
                                                        {((user as User).status ?? 'invited').charAt(0).toUpperCase() + ((user as User).status ?? 'invited').slice(1)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <TooltipProvider>
                                                        {user.status !== 'invited' && (
                                                            <>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button variant="ghost" size="icon" onClick={() => { setEditingUser(user); setIsUserFormOpen(true); }}>
                                                                        <Edit className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Edit User</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button variant="ghost" size="icon" onClick={() => handleToggleUserStatus(user as User)} disabled={user.id === authUser?.uid}>
                                                                        {(user.status ?? 'active') === 'active' ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>{(user.status ?? 'active') === 'active' ? 'Deactivate' : 'Activate'} User</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                            </>
                                                        )}
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button variant="ghost" size="icon" onClick={() => setUserToDelete(user)} disabled={user.id === authUser?.uid}>
                                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>{user.status === 'invited' ? 'Delete Invitation' : 'Delete User'}</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="water">
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {waterDataLoading ? (
                                <>
                                    <Card className="rounded-xl shadow-md"><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
                                    <Card className="rounded-xl shadow-md"><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
                                    <Card className="rounded-xl shadow-md"><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
                                </>
                            ) : (
                                <>
                                <Card className="rounded-xl shadow-md">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium">Total Active Users</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-3xl font-bold">{activeUsers.length}</p>
                                    </CardContent>
                                </Card>
                                <Card className="rounded-xl shadow-md">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium">Total Allocation for Period</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-3xl font-bold">{(totalAllocation / 1000).toFixed(0)}K <span className="text-lg font-normal text-muted-foreground">gal</span></p>
                                    </CardContent>
                                </Card>
                                <Card className="rounded-xl shadow-md">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium">Total Consumed for Period</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-3xl font-bold">{(totalWaterConsumed / 1000).toFixed(0)}K <span className="text-lg font-normal text-muted-foreground">gal</span></p>
                                    </CardContent>
                                </Card>
                                </>
                            )}
                        </div>

                        <Card className="rounded-xl shadow-md">
                            <CardHeader>
                                <CardTitle className="text-xl">Allocation Management</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col sm:flex-row items-end gap-4">
                                    <div className="flex-grow w-full">
                                        <label htmlFor="total-allocation" className="block text-sm font-medium text-foreground mb-1">Total Allocation for Period (Gallons)</label>
                                        {waterDataLoading ? <Skeleton className="h-10 w-full" /> : 
                                            <Input
                                                type="number"
                                                id="total-allocation"
                                                value={totalAllocation}
                                                onChange={(e) => setTotalAllocation(Number(e.target.value))}
                                                placeholder="e.g. 5000000"
                                            />
                                        }
                                    </div>
                                    <div className="flex gap-2 w-full sm:w-auto flex-shrink-0 flex-wrap">
                                        <Button className="w-full sm:w-auto" onClick={handleUpdateAllocation} disabled={waterDataLoading}>
                                            Update Allocation
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                         <Card className="rounded-xl shadow-md">
                            <CardHeader>
                                <CardTitle className="text-xl">Upload Usage Data</CardTitle>
                                <CardDescription>
                                    Upload a CSV file with individual water usage records for the period.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="outline" onClick={() => usageFileInputRef.current?.click()}>
                                                <Upload className="mr-2 h-4 w-4" />
                                                Upload Usage CSV
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Upload a CSV with columns: `name`, `used`, `date` (YYYY-MM-DD).</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                <input
                                    ref={usageFileInputRef}
                                    type="file"
                                    id="csv-upload"
                                    className="hidden"
                                    accept=".csv"
                                    onChange={handleUsageCsvUpload}
                                />
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>

            <UserForm
                isOpen={isUserFormOpen}
                onOpenChange={(isOpen) => {
                    setIsUserFormOpen(isOpen);
                    if (!isOpen) {
                        setEditingUser(null);
                    }
                }}
                onSave={handleFormSave}
                user={editingUser}
            />

            <AlertDialog open={!!userToDelete} onOpenChange={(isOpen) => !isOpen && setUserToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {userToDelete?.status === 'invited' ? (
                                <>This will permanently delete the invitation for <span className="font-bold">{userToDelete?.name}</span>. They will not be able to sign up.</>
                            ) : (
                                <>This action cannot be undone. This will permanently delete the user account for <span className="font-bold">{userToDelete?.name}</span> from the user list. You can only delete users who have no water usage history.</>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete} className={buttonVariants({ variant: "destructive" })}>
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
