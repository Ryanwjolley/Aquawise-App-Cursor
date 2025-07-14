
'use client';
import React, {useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CalendarDays, Upload, Edit, UserPlus, Ban, CheckCircle, Trash2, PlusCircle, Users, BarChart, Droplets } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableCell, TableBody } from '@/components/ui/table';
import { getUsageForDateRange, getAllocationsForPeriod, setAllocation, getUsers, updateUser, inviteUser, updateUserStatus, deleteUser, getInvites, deleteInvite, addUsageEntry, createUserDocument, getAllocations, Allocation, updateAllocation, deleteAllocation } from '../firestoreService';
import type { User, Invite } from '../firestoreService';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { UserForm } from './user-form';
import { AllocationForm } from './allocation-form';
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

type UserData = User | Invite;
type AllocationData = { id?: string; startDate: Date; endDate: Date; totalAllocationGallons: number };

export default function AdminDashboard() {
    const [userData, setUserData] = useState<UserData[]>([]);
    const [allocations, setAllocations] = useState<Allocation[]>([]);
    const [loading, setLoading] = useState(true);
    const [waterDataLoading, setWaterDataLoading] = useState(false);
    const [totalWaterConsumed, setTotalWaterConsumed] = useState(0);
    const [totalPeriodAllocation, setTotalPeriodAllocation] = useState(0);
    
    const [isUserFormOpen, setIsUserFormOpen] = useState(false);
    const [isAllocationFormOpen, setIsAllocationFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
    const [editingAllocation, setEditingAllocation] = useState<Allocation | null>(null);
    const [userToDelete, setUserToDelete] = useState<(User | Invite) | null>(null);
    const [allocationToDelete, setAllocationToDelete] = useState<Allocation | null>(null);

    const [gapConfirmation, setGapConfirmation] = useState<{ isOpen: boolean, data: AllocationData | null, message: string }>({ isOpen: false, data: null, message: '' });
    
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
            return combinedData;
        } catch(error) {
            toast({
                variant: 'destructive',
                title: 'User Data Fetch Failed',
                description: 'Could not load user and invitation list.',
            });
            console.error(error);
            return [];
        } finally {
            setLoading(false);
        }
    }, [toast]);

    const fetchWaterData = useCallback(async () => {
        let usersToFetch = userData.filter(u => u.status !== 'invited') as User[];
        if (usersToFetch.length === 0 && userData.length > 0) {
             usersToFetch = userData.filter(u => u.status !== 'invited') as User[];
        } else if (usersToFetch.length === 0 && !loading) {
            const fetchedData = await fetchUserData();
            usersToFetch = fetchedData.filter(u => u.status !== 'invited') as User[];
        }

        if (!date?.from || !date.to) {
            setTotalWaterConsumed(0);
            setTotalPeriodAllocation(0);
            return;
        }
        
        setWaterDataLoading(true);
        try {
            const userIds = usersToFetch.filter(u => u.status === 'active').map(u => u.id);

            const [allocations, usageDataById] = await Promise.all([
                getAllocationsForPeriod(date.from, date.to),
                userIds.length > 0 ? getUsageForDateRange(userIds, date.from, date.to) : Promise.resolve({}),
            ]);
            
            const totalAllocation = allocations.reduce((sum, alloc) => sum + alloc.totalAllocationGallons, 0);
            setTotalPeriodAllocation(totalAllocation);

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
    }, [date, toast, userData, loading, fetchUserData]);

    const fetchAllocations = useCallback(async () => {
        try {
            const fetchedAllocations = await getAllocations();
            setAllocations(fetchedAllocations);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Allocation Fetch Failed',
                description: 'Could not load the list of allocations.',
            });
        }
    }, [toast]);


    useEffect(() => {
        fetchUserData();
        fetchAllocations();
    }, [fetchUserData, fetchAllocations]);
    
    useEffect(() => {
        const activeTab = document.querySelector('[data-state="active"]')?.getAttribute('data-value');
        if (activeTab === 'water') {
            fetchWaterData();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [date]);


    const onTabChange = async (tab: string) => {
        if (tab === 'water') {
            await fetchWaterData();
            await fetchAllocations();
        }
    }
    
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
                const registeredUsers = userData.filter((u) => u.status !== 'invited') as User[];
                const validUserIds = new Set(registeredUsers.map((u) => u.id));

                for (const line of lines) {
                    if (!line.trim()) continue;
                    const [userId, usedStr, dateStr] = line.split(',');
                    if (userId && usedStr && dateStr) {
                        const trimmedUserId = userId.trim();
                        const used = parseInt(usedStr.trim(), 10);
                        const trimmedDate = dateStr.trim();

                        if (validUserIds.has(trimmedUserId) && !isNaN(used) && trimmedDate) {
                            usageEntries.push({ userId: trimmedUserId, consumption: used, date: trimmedDate });
                            updatesMade++;
                        }
                    }
                }
                
                if (updatesMade > 0) {
                    await Promise.all(usageEntries.map(entry => addUsageEntry(entry)));
                    fetchWaterData();
                    toast({
                        title: 'Upload Successful',
                        description: `Logged usage for ${updatesMade} record(s).`,
                    });
                } else {
                     toast({
                        variant: 'destructive',
                        title: 'No Updates Made',
                        description: 'CSV data did not match any existing users or was invalid. Expected format: userId,consumption,date.',
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
                
                const usersToCreate = [];
                for (const line of lines) {
                    if (!line.trim()) continue;
                    const [name, email, userId, role, sharesStr] = line.split(',');
                    if (name && email && userId && role && sharesStr) {
                        const shares = parseInt(sharesStr.trim(), 10);
                        const trimmedRole = role.trim().toLowerCase();
                        if (!isNaN(shares) && (trimmedRole === 'admin' || trimmedRole === 'customer')) {
                            usersToCreate.push({ 
                                id: userId.trim(),
                                data: {
                                    name: name.trim(), 
                                    email: email.trim(), 
                                    shares, 
                                    role: trimmedRole as 'admin' | 'customer' 
                                }
                            });
                        }
                    }
                }
                
                if (usersToCreate.length > 0) {
                    await Promise.all(usersToCreate.map(user => createUserDocument(user.id, user.data)));
                    fetchUserData();
                    toast({
                        title: 'Upload Successful',
                        description: `Created or updated ${usersToCreate.length} user(s).`,
                    });
                } else {
                     toast({
                        variant: 'destructive',
                        title: 'No Users Created',
                        description: 'CSV data was invalid or empty. Expected format: User,Email,User ID,Role,Shares.',
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

    const proceedWithSave = async (data: AllocationData) => {
        try {
            if (data.id) {
                await updateAllocation(data.id, { startDate: data.startDate, endDate: data.endDate, totalAllocationGallons: data.totalAllocationGallons });
                toast({ title: 'Allocation Updated', description: `Successfully updated allocation period.` });
            } else {
                await setAllocation(data.startDate, data.endDate, data.totalAllocationGallons);
                toast({ title: 'Allocation Created', description: `Successfully created new allocation period.` });
            }
            fetchAllocations();
            fetchWaterData();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the allocation.' });
        }
    };


    const handleAllocationSave = (data: AllocationData) => {
        // --- OVERLAP VALIDATION ---
        const otherAllocations = allocations.filter(alloc => alloc.id !== data.id);
        const hasOverlap = otherAllocations.some(alloc => 
            data.startDate < alloc.endDate && data.endDate > alloc.startDate
        );

        if (hasOverlap) {
            toast({
                variant: 'destructive',
                title: 'Validation Error',
                description: 'The provided time period overlaps with an existing allocation. Please adjust the dates and times.',
            });
            return;
        }

        // --- GAP VALIDATION ---
        const sortedAllocations = [...otherAllocations, { ...data, id: data.id || 'new' }].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
        const currentIndex = sortedAllocations.findIndex(alloc => (alloc.id === data.id || alloc.id === 'new'));

        const prevAllocation = sortedAllocations[currentIndex - 1];
        const nextAllocation = sortedAllocations[currentIndex + 1];
        
        let gapMessage = '';
        if (prevAllocation && data.startDate > prevAllocation.endDate) {
            gapMessage += `This creates a gap between this allocation and the previous one ending at ${format(prevAllocation.endDate, 'PPp')}. `;
        }
        if (nextAllocation && data.endDate < nextAllocation.startDate) {
            gapMessage += `This creates a gap between this allocation and the next one starting at ${format(nextAllocation.startDate, 'PPp')}.`;
        }
        
        if (gapMessage) {
            setGapConfirmation({ isOpen: true, data, message: `${gapMessage.trim()} Are you sure you want to continue?` });
        } else {
            proceedWithSave(data);
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

    const handleConfirmUserDelete = async () => {
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

    const handleConfirmAllocationDelete = async () => {
        if (!allocationToDelete) return;
        try {
            await deleteAllocation(allocationToDelete.id);
            toast({
                title: 'Allocation Deleted',
                description: `The allocation period has been successfully deleted.`,
            });
            fetchAllocations();
            fetchWaterData();
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Deletion Failed',
                description: 'Could not delete the allocation.',
            });
        } finally {
            setAllocationToDelete(null);
        }
    };

    const activeUsers = useMemo(() => {
        return userData.filter(u => u.status === 'active');
    }, [userData]);
    
    const totalSharesIssued = useMemo(() => {
        return (userData.filter(u => u.status !== 'invited') as User[]).reduce((acc, user) => acc + user.shares, 0);
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
                                            <p>Upload a CSV with columns: `User`, `Email`, `User ID`, `Role`, `Shares`.</p>
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
                                            <TableHead>User ID</TableHead>
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
                                                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
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
                                                <TableCell><code className="text-xs p-1 bg-muted rounded-sm">{user.id}</code></TableCell>
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
                        <Card className="rounded-xl shadow-md">
                            <CardHeader>
                                <CardTitle className="text-xl">System Information</CardTitle>
                            </CardHeader>
                             <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                     <Card className="rounded-lg">
                                        <CardHeader className="pb-2 flex-row items-center justify-between">
                                            <CardTitle className="text-sm font-medium">Total Active Users</CardTitle>
                                            <Users className="h-4 w-4 text-muted-foreground" />
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-2xl font-bold">{activeUsers.length}</p>
                                        </CardContent>
                                    </Card>
                                     <Card className="rounded-lg">
                                        <CardHeader className="pb-2 flex-row items-center justify-between">
                                            <CardTitle className="text-sm font-medium">Total Shares Issued</CardTitle>
                                            <BarChart className="h-4 w-4 text-muted-foreground" />
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-2xl font-bold">{totalSharesIssued.toLocaleString()}</p>
                                        </CardContent>
                                    </Card>
                                     <Card className="rounded-lg">
                                        <CardHeader className="pb-2 flex-row items-center justify-between">
                                            <CardTitle className="text-sm font-medium">Total Allocation for Period</CardTitle>
                                            <Droplets className="h-4 w-4 text-muted-foreground" />
                                        </CardHeader>
                                        <CardContent>
                                             {waterDataLoading ? <Skeleton className="h-7 w-2/3" /> :
                                                <p className="text-2xl font-bold">{(totalPeriodAllocation / 1000).toFixed(0)}K <span className="text-base font-normal text-muted-foreground">gal</span></p>
                                             }
                                        </CardContent>
                                    </Card>
                                     <Card className="rounded-lg">
                                        <CardHeader className="pb-2 flex-row items-center justify-between">
                                            <CardTitle className="text-sm font-medium">Total Consumed for Period</CardTitle>
                                            <Droplets className="h-4 w-4 text-primary" />
                                        </CardHeader>
                                        <CardContent>
                                             {waterDataLoading ? <Skeleton className="h-7 w-2/3" /> :
                                                <p className="text-2xl font-bold">{(totalWaterConsumed / 1000).toFixed(0)}K <span className="text-base font-normal text-muted-foreground">gal</span></p>
                                             }
                                        </CardContent>
                                    </Card>
                                </div>
                                <div className="flex justify-end">
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
                            </CardContent>
                        </Card>

                        <Card className="rounded-xl shadow-md">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-xl">Allocation Management</CardTitle>
                                    <CardDescription>Create and view allocation periods.</CardDescription>
                                </div>
                                <Button onClick={() => { setEditingAllocation(null); setIsAllocationFormOpen(true); }}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    New Allocation
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Start Date & Time</TableHead>
                                            <TableHead>End Date & Time</TableHead>
                                            <TableHead className="text-right">Total Gallons Allocated</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {waterDataLoading ? (
                                             Array.from({length: 3}).map((_, i) => (
                                                <TableRow key={`alloc-skel-${i}`}>
                                                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                                    <TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                                                    <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                                                </TableRow>
                                             ))
                                        ) : allocations.map((alloc) => (
                                            <TableRow key={alloc.id}>
                                                <TableCell>{format(alloc.startDate, 'MMM d, yyyy, h:mm a')}</TableCell>
                                                <TableCell>{format(alloc.endDate, 'MMM d, yyyy, h:mm a')}</TableCell>
                                                <TableCell className="text-right">{alloc.totalAllocationGallons.toLocaleString()}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button variant="ghost" size="icon" onClick={() => { setEditingAllocation(alloc); setIsAllocationFormOpen(true); }}>
                                                                        <Edit className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Edit Allocation</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button variant="ghost" size="icon" onClick={() => setAllocationToDelete(alloc)}>
                                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Delete Allocation</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
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
                                            <p>Upload a CSV with columns: `userId`, `consumption`, `date` (YYYY-MM-DD).</p>
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

            <AllocationForm
                isOpen={isAllocationFormOpen}
                onOpenChange={(isOpen) => {
                    setIsAllocationFormOpen(isOpen);
                    if (!isOpen) {
                        setEditingAllocation(null);
                    }
                }}
                onSave={handleAllocationSave}
                allocation={editingAllocation}
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
                        <AlertDialogAction onClick={handleConfirmUserDelete} className={buttonVariants({ variant: "destructive" })}>
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!allocationToDelete} onOpenChange={(isOpen) => !isOpen && setAllocationToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this allocation period.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmAllocationDelete} className={buttonVariants({ variant: "destructive" })}>
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={gapConfirmation.isOpen} onOpenChange={(isOpen) => !isOpen && setGapConfirmation({ isOpen: false, data: null, message: '' })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Gap Detected in Allocations</AlertDialogTitle>
                        <AlertDialogDescription>
                            {gapConfirmation.message}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => {
                            if (gapConfirmation.data) {
                                proceedWithSave(gapConfirmation.data);
                            }
                            setGapConfirmation({ isOpen: false, data: null, message: '' });
                        }}>
                            Continue Anyway
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
