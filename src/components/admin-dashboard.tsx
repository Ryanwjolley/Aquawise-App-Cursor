'use client';
import React, {useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Upload, Edit, UserPlus, Ban, CheckCircle, Trash2, PlusCircle, Users, BarChart, Droplets, Bell, Building } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableCell, TableBody } from '@/components/ui/table';
import { getUsageForDateRange, getAllocationsForPeriod, setAllocation, getUsers, updateUser, inviteUser, updateUserStatus, deleteUser, getInvites, deleteInvite, addUsageEntry, createUserDocument, getAllocations, Allocation, updateAllocation, AllocationData, deleteAllocation, addCompany } from '../firestoreService';
import type { User, Invite, Company } from '../firestoreService';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { DateRange } from 'react-day-picker';
import { format, differenceInMinutes } from 'date-fns';
import { cn, convertAndFormat } from '@/lib/utils';
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
import { useUnit } from '@/context/unit-context';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { DateRangeSelector } from './date-range-selector';
import { NotificationSettings } from './notification-settings';
import { Input } from './ui/input';
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

type UserData = User | Invite;

export default function AdminDashboard() {
    const { user: authUser, companies, refreshCompanies } = useAuth();
    const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

    const [userData, setUserData] = useState<UserData[]>([]);
    const [allTimeAllocations, setAllTimeAllocations] = useState<Allocation[]>([]);
    const [loading, setLoading] = useState(true);
    const [waterDataLoading, setWaterDataLoading] = useState(false);
    const [totalWaterConsumed, setTotalWaterConsumed] = useState(0);
    const [totalPeriodAllocation, setTotalPeriodAllocation] = useState(0);
    
    const [isUserFormOpen, setIsUserFormOpen] = useState(false);
    const [isAllocationFormOpen, setIsAllocationFormOpen] = useState(false);
    const [isCompanyFormOpen, setIsCompanyFormOpen] = useState(false);
    const [newCompanyName, setNewCompanyName] = useState('');
    const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
    const [editingAllocation, setEditingAllocation] = useState<Allocation | null>(null);
    const [userToDelete, setUserToDelete] = useState<(User | Invite) | null>(null);
    const [allocationToDelete, setAllocationToDelete] = useState<Allocation | null>(null);

    const [gapConfirmation, setGapConfirmation] = useState<{ isOpen: boolean, data: AllocationData | null, message: string }>({ isOpen: false, data: null, message: '' });
    
    const { toast } = useToast();
    const { unit, setUnit, getUnitLabel } = useUnit();
    const usageFileInputRef = React.useRef<HTMLInputElement>(null);
    const userFileInputRef = React.useRef<HTMLInputElement>(null);
    const [date, setDate] = useState<DateRange | undefined>(undefined);

    // Set default company on initial load
    useEffect(() => {
        if (companies.length > 0 && !selectedCompanyId) {
            setSelectedCompanyId(companies[0].id);
        }
    }, [companies, selectedCompanyId]);
    
    const fetchUserData = useCallback(async () => {
        if (!selectedCompanyId) return;
        setLoading(true);
        try {
            const [fetchedUsers, fetchedInvites] = await Promise.all([
                getUsers(selectedCompanyId),
                getInvites(selectedCompanyId),
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
    }, [selectedCompanyId, toast]);

    const fetchAllTimeAllocations = useCallback(async () => {
        if (!selectedCompanyId) return;
        setWaterDataLoading(true);
        try {
            const fetchedAllocations = await getAllocations(selectedCompanyId);
            setAllTimeAllocations(fetchedAllocations);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Allocation Fetch Failed',
                description: 'Could not load the list of allocations.',
            });
        } finally {
            setWaterDataLoading(false);
        }
    }, [selectedCompanyId, toast]);

    const fetchWaterData = useCallback(async () => {
        if (!date?.from || !date.to || !selectedCompanyId) {
            setTotalWaterConsumed(0);
            return;
        }

        setWaterDataLoading(true);
        try {
            const usersToFetch = userData.filter(u => u.status === 'active') as User[];
            const userIds = usersToFetch.map(u => u.id);

            const usageDataById = userIds.length > 0 ? await getUsageForDateRange(userIds, selectedCompanyId, date.from, date.to) : {};
            
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
    }, [date, toast, userData, selectedCompanyId]);
    
    // Refetch data when company changes
    useEffect(() => {
        if (selectedCompanyId) {
            fetchUserData();
            fetchAllTimeAllocations();
        }
    }, [selectedCompanyId, fetchUserData, fetchAllTimeAllocations]);
    
    const periodAllocations = useMemo(() => {
        if (!date?.from || !date.to) return [];
        return allTimeAllocations.filter(alloc => alloc.endDate >= date.from! && alloc.startDate <= date.to!);
    }, [allTimeAllocations, date]);

    useEffect(() => {
        fetchWaterData();
    }, [date, fetchWaterData]);

    useEffect(() => {
        const totalAllocation = periodAllocations.reduce((sum, alloc) => sum + alloc.totalAllocationGallons, 0);
        setTotalPeriodAllocation(totalAllocation);
    }, [periodAllocations]);


    const onTabChange = async (tab: string) => {
        if (tab === 'water' && selectedCompanyId) {
            await fetchAllTimeAllocations();
        }
    }
    
    const handleUsageCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !selectedCompanyId) return;

        if (file.type !== 'text/csv') {
            toast({ variant: 'destructive', title: 'Invalid File Type', description: 'Please upload a valid .csv file.' });
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
                            usageEntries.push({ userId: trimmedUserId, companyId: selectedCompanyId, consumption: used, date: trimmedDate });
                            updatesMade++;
                        }
                    }
                }
                
                if (updatesMade > 0) {
                    await Promise.all(usageEntries.map(entry => addUsageEntry(entry)));
                    fetchWaterData();
                    toast({ title: 'Upload Successful', description: `Logged usage for ${updatesMade} record(s).` });
                } else {
                     toast({ variant: 'destructive', title: 'No Updates Made', description: 'CSV data did not match any existing users or was invalid. Expected format: userId,consumption,date.' });
                }
            } catch (error) {
                 toast({ variant: 'destructive', title: 'Error Processing File', description: 'Could not parse or upload the CSV file. Please check the format and file content.' });
                console.error("Error parsing CSV:", error);
            } finally {
                if (usageFileInputRef.current) { usageFileInputRef.current.value = ''; }
            }
        };
        reader.readAsText(file);
    };

    const handleUserCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !selectedCompanyId) return;

        if (file.type !== 'text/csv') {
            toast({ variant: 'destructive', title: 'Invalid File Type', description: 'Please upload a valid .csv file.' });
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
                                data: { companyId: selectedCompanyId, name: name.trim(), email: email.trim(), shares, role: trimmedRole as 'admin' | 'customer' }
                            });
                        }
                    }
                }
                
                if (usersToCreate.length > 0) {
                    await Promise.all(usersToCreate.map(user => createUserDocument(user.id, user.data)));
                    fetchUserData();
                    toast({ title: 'Upload Successful', description: `Created or updated ${usersToCreate.length} user(s).` });
                } else {
                     toast({ variant: 'destructive', title: 'No Users Created', description: 'CSV data was invalid or empty. Expected format: User,Email,User ID,Role,Shares.' });
                }
            } catch (error) {
                 toast({ variant: 'destructive', title: 'Error Processing File', description: 'Could not parse or upload the user CSV file.' });
                console.error("Error parsing user CSV:", error);
            } finally {
                if (userFileInputRef.current) { userFileInputRef.current.value = ''; }
            }
        };
        reader.readAsText(file);
    };

    const proceedWithSave = async (data: AllocationData) => {
        if (!selectedCompanyId) return;
        try {
            const allocationData = { ...data, companyId: selectedCompanyId };
            if (data.id) {
                await updateAllocation(data.id, allocationData);
                toast({ title: 'Allocation Updated', description: `Successfully updated allocation period.` });
            } else {
                await setAllocation(allocationData);
                toast({ title: 'Allocation Created', description: `Successfully created new allocation period.` });
            }
            fetchAllTimeAllocations();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the allocation.' });
        }
    };


    const handleAllocationSave = (data: AllocationData) => {
        if (!selectedCompanyId) return;
        const otherAllocations = allTimeAllocations.filter(alloc => alloc.id !== data.id);
        const hasOverlap = otherAllocations.some(alloc => data.startDate < alloc.endDate && data.endDate > alloc.startDate);

        if (hasOverlap) {
            toast({ variant: 'destructive', title: 'Validation Error', description: 'The provided time period overlaps with an existing allocation. Please adjust the dates and times.' });
            return;
        }

        const sortedAllocations = [...otherAllocations, { ...data, id: data.id || 'new' }].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
        const currentIndex = sortedAllocations.findIndex(alloc => (alloc.id === data.id || alloc.id === 'new'));

        const prevAllocation = sortedAllocations[currentIndex - 1];
        const nextAllocation = sortedAllocations[currentIndex + 1];
        
        let gapMessage = '';
        if (prevAllocation && differenceInMinutes(data.startDate, prevAllocation.endDate) > 1) {
            gapMessage += `This creates a gap between this allocation and the previous one ending at ${format(prevAllocation.endDate, 'PPp')}. `;
        }
        if (nextAllocation && differenceInMinutes(nextAllocation.startDate, data.endDate) > 1) {
            gapMessage += `This creates a gap between this allocation and the next one starting at ${format(nextAllocation.startDate, 'PPp')}.`;
        }
        
        if (gapMessage) {
            setGapConfirmation({ isOpen: true, data, message: `${gapMessage.trim()} Are you sure you want to continue?` });
        } else {
            proceedWithSave(data);
        }
    };
    
    const handleFormSave = async (formData: { name: string; email: string; shares: number; role: 'admin' | 'customer' }) => {
        if (!selectedCompanyId) return;
        try {
            if (editingUser && editingUser.status !== 'invited') {
                await updateUser(editingUser.id!, {name: formData.name, shares: formData.shares, role: formData.role});
                toast({ title: 'User Updated', description: `Updated details for ${formData.name}.` });
            } else {
                await inviteUser({ ...formData, companyId: selectedCompanyId });
                toast({ title: 'User Invited', description: `An invitation has been created for ${formData.email}.` });
            }
            fetchUserData();
            setEditingUser(null);
        } catch (error) {
            const action = editingUser && editingUser.status !== 'invited' ? 'save' : 'invite';
             toast({ variant: 'destructive', title: `${action.charAt(0).toUpperCase() + action.slice(1)} Failed`, description: `Could not ${action} user.` });
        }
    };

    const handleToggleUserStatus = async (userToToggle: User) => {
        if (userToToggle.id === authUser?.uid) {
            toast({ variant: 'destructive', title: 'Action Forbidden', description: 'You cannot deactivate your own account.' });
            return;
        }

        const newStatus = (userToToggle.status ?? 'active') === 'active' ? 'inactive' : 'active';
        try {
            await updateUserStatus(userToToggle.id, newStatus);
            fetchUserData();
            toast({ title: 'User Status Updated', description: `${userToToggle.name} has been ${newStatus === 'active' ? 'activated' : 'deactivated'}.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update user status.' });
        }
    };

    const handleConfirmUserDelete = async () => {
        if (!userToDelete) return;
    
        try {
            if (userToDelete.status === 'invited') {
                await deleteInvite(userToDelete.id);
                 toast({ title: 'Invitation Deleted', description: `The invitation for ${userToDelete.name} has been deleted.` });
            } else {
                await deleteUser(userToDelete.id);
                toast({ title: 'User Deleted', description: `${userToDelete.name} has been successfully deleted.` });
            }
            fetchUserData();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Deletion Failed', description: error.message || 'Could not perform delete action.' });
        } finally {
            setUserToDelete(null);
        }
    };

    const handleConfirmAllocationDelete = async () => {
        if (!allocationToDelete) return;
        try {
            await deleteAllocation(allocationToDelete.id);
            toast({ title: 'Allocation Deleted', description: `The allocation period has been successfully deleted.` });
            fetchAllTimeAllocations();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Deletion Failed', description: 'Could not delete the allocation.' });
        } finally {
            setAllocationToDelete(null);
        }
    };

    const handleAddCompany = async () => {
        if (!newCompanyName.trim()) {
            toast({ variant: 'destructive', title: 'Company Name Required', description: 'Please enter a name for the new company.'});
            return;
        }
        try {
            const newCompanyId = await addCompany(newCompanyName);
            await refreshCompanies();
            setSelectedCompanyId(newCompanyId);
            setNewCompanyName('');
            setIsCompanyFormOpen(false);
            toast({ title: 'Company Created', description: `Successfully created ${newCompanyName}.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Failed to Create Company', description: 'Could not create the new company.' });
        }
    }

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
    
    const selectedCompanyName = companies.find(c => c.id === selectedCompanyId)?.name || 'Select a Company';

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <header className="flex flex-col sm:flex-row justify-between sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Water Master Dashboard</h1>
                    <p className="text-muted-foreground">{selectedCompanyName}</p>
                </div>
                 <div className="flex items-center gap-2">
                    <Select onValueChange={setSelectedCompanyId} value={selectedCompanyId || ''}>
                        <SelectTrigger className="w-[280px]">
                            <SelectValue placeholder="Select a company to manage" />
                        </SelectTrigger>
                        <SelectContent>
                            {companies.map(company => (
                                <SelectItem key={company.id} value={company.id}>
                                    {company.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Dialog open={isCompanyFormOpen} onOpenChange={setIsCompanyFormOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon"><Building className="h-4 w-4" /></Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Company</DialogTitle>
                                <DialogDescription>Create a new company to manage users and water allocations.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-2 py-4">
                                <Label htmlFor='company-name'>Company Name</Label>
                                <Input id="company-name" placeholder="e.g. Sterling Irrigation Inc." value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} />
                            </div>
                            <DialogFooter>
                                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                                <Button onClick={handleAddCompany}>Create Company</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </header>
            
            {!selectedCompanyId ? (
                <Card className="rounded-xl shadow-md flex items-center justify-center p-16">
                    <div className="text-center">
                        <Building className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h2 className="mt-4 text-xl font-semibold">No Company Selected</h2>
                        <p className="mt-2 text-muted-foreground">Please select a company from the dropdown above to begin.</p>
                    </div>
                </Card>
            ) : (
            <Tabs defaultValue="users" onValueChange={onTabChange}>
                <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="users"><Users className='mr-2 h-4 w-4' />User Management</TabsTrigger>
                    <TabsTrigger value="water"><Droplets className='mr-2 h-4 w-4' />Water Management</TabsTrigger>
                     <TabsTrigger value="notifications"><Bell className='mr-2 h-4 w-4' />Notification Center</TabsTrigger>
                </TabsList>
                
                <TabsContent value="users">
                    <Card className="rounded-xl shadow-md overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div><CardTitle className="text-xl">User & Invitation Management</CardTitle></div>
                            <div className='flex items-center gap-2'>
                                <Button variant="outline" onClick={() => { setEditingUser(null); setIsUserFormOpen(true); }}><UserPlus className="mr-2 h-4 w-4" />Invite User</Button>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="outline" onClick={() => userFileInputRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Upload Users</Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Upload a CSV with columns: `User`, `Email`, `User ID`, `Role`, `Shares`.</p></TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                <input ref={userFileInputRef} type="file" id="user-csv-upload" className="hidden" accept=".csv" onChange={handleUserCsvUpload}/>
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
                                                                    <Button variant="ghost" size="icon" onClick={() => { setEditingUser(user); setIsUserFormOpen(true); }}><Edit className="h-4 w-4" /></Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent><p>Edit User</p></TooltipContent>
                                                            </Tooltip>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button variant="ghost" size="icon" onClick={() => handleToggleUserStatus(user as User)} disabled={user.id === authUser?.uid}>{(user.status ?? 'active') === 'active' ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}</Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent><p>{(user.status ?? 'active') === 'active' ? 'Deactivate' : 'Activate'} User</p></TooltipContent>
                                                            </Tooltip>
                                                            </>
                                                        )}
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button variant="ghost" size="icon" onClick={() => setUserToDelete(user)} disabled={user.id === authUser?.uid}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent><p>{user.status === 'invited' ? 'Delete Invitation' : 'Delete User'}</p></TooltipContent>
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
                            <CardHeader className='flex-row items-center justify-between'>
                                <CardTitle className="text-xl">System Information</CardTitle>
                                <div className='flex items-center gap-4'>
                                    <div className="flex items-center gap-2"><Label htmlFor="unit-select">Units</Label>
                                        <Select onValueChange={(value) => setUnit(value as 'gallons' | 'acre-feet')} value={unit}>
                                            <SelectTrigger className="w-[120px]" id="unit-select"><SelectValue placeholder="Select unit" /></SelectTrigger>
                                            <SelectContent><SelectItem value="gallons">Gallons</SelectItem><SelectItem value="acre-feet">Acre-Feet</SelectItem></SelectContent>
                                        </Select>
                                    </div>
                                    <DateRangeSelector date={date} setDate={setDate} allocations={allTimeAllocations}/>
                                </div>
                            </CardHeader>
                             <CardContent className="space-y-4 pt-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                     <Card className="rounded-lg"><CardHeader className="pb-2 flex-row items-center justify-between"><CardTitle className="text-sm font-medium">Total Active Users</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><p className="text-2xl font-bold">{activeUsers.length}</p></CardContent></Card>
                                     <Card className="rounded-lg"><CardHeader className="pb-2 flex-row items-center justify-between"><CardTitle className="text-sm font-medium">Total Shares Issued</CardTitle><BarChart className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><p className="text-2xl font-bold">{totalSharesIssued.toLocaleString()}</p></CardContent></Card>
                                     <Card className="rounded-lg"><CardHeader className="pb-2 flex-row items-center justify-between"><CardTitle className="text-sm font-medium">Total Allocation for Period</CardTitle><Droplets className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent>{waterDataLoading ? <Skeleton className="h-7 w-2/3" /> : <p className="text-2xl font-bold">{convertAndFormat(totalPeriodAllocation, unit)} <span className="text-base font-normal text-muted-foreground">{getUnitLabel()}</span></p>}</CardContent></Card>
                                     <Card className="rounded-lg"><CardHeader className="pb-2 flex-row items-center justify-between"><CardTitle className="text-sm font-medium">Total Consumed for Period</CardTitle><Droplets className="h-4 w-4 text-primary" /></CardHeader><CardContent>{waterDataLoading ? <Skeleton className="h-7 w-2/3" /> : <p className="text-2xl font-bold">{convertAndFormat(totalWaterConsumed, unit)} <span className="text-base font-normal text-muted-foreground">{getUnitLabel()}</span></p>}</CardContent></Card>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="rounded-xl shadow-md">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div><CardTitle className="text-xl">Allocation Management</CardTitle><CardDescription>Create and view allocation periods.</CardDescription></div>
                                <Button onClick={() => { setEditingAllocation(null); setIsAllocationFormOpen(true); }}><PlusCircle className="mr-2 h-4 w-4" />New Allocation</Button>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Start Date & Time</TableHead>
                                            <TableHead>End Date & Time</TableHead>
                                            <TableHead className="text-right">Total Allocation</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {waterDataLoading ? (
                                             Array.from({length: 3}).map((_, i) => (<TableRow key={`alloc-skel-${i}`}><TableCell><Skeleton className="h-5 w-40" /></TableCell><TableCell><Skeleton className="h-5 w-40" /></TableCell><TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell><TableCell><Skeleton className="h-8 w-20" /></TableCell></TableRow>))
                                        ) : allTimeAllocations.map((alloc) => (
                                            <TableRow key={alloc.id}>
                                                <TableCell>{format(alloc.startDate, 'MMM d, yyyy, h:mm a')}</TableCell>
                                                <TableCell>{format(alloc.endDate, 'MMM d, yyyy, h:mm a')}</TableCell>
                                                <TableCell className="text-right">{convertAndFormat(alloc.totalAllocationGallons, unit)} <span className="text-xs text-muted-foreground">{getUnitLabel()}</span></TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1 justify-end">
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => { setEditingAllocation(alloc); setIsAllocationFormOpen(true); }}><Edit className="h-4 w-4" /></Button></TooltipTrigger>
                                                                <TooltipContent><p>Edit Allocation</p></TooltipContent>
                                                            </Tooltip>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => setAllocationToDelete(alloc)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TooltipTrigger>
                                                                <TooltipContent><p>Delete Allocation</p></TooltipContent>
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
                            <CardHeader><CardTitle className="text-xl">Upload Usage Data</CardTitle><CardDescription>Upload a CSV file with individual water usage records for the period.</CardDescription></CardHeader>
                            <CardContent>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild><Button variant="outline" onClick={() => usageFileInputRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Upload Usage CSV</Button></TooltipTrigger>
                                        <TooltipContent><p>Upload a CSV with columns: `userId`, `consumption`, `date` (YYYY-MM-DD).</p></TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                <input ref={usageFileInputRef} type="file" id="csv-upload" className="hidden" accept=".csv" onChange={handleUsageCsvUpload}/>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
                <TabsContent value="notifications">
                    <NotificationSettings companyId={selectedCompanyId} />
                </TabsContent>
            </Tabs>
            )}

            <UserForm
                isOpen={isUserFormOpen}
                onOpenChange={(isOpen) => { setIsUserFormOpen(isOpen); if (!isOpen) { setEditingUser(null); }}}
                onSave={handleFormSave}
                user={editingUser}
            />

            <AllocationForm
                isOpen={isAllocationFormOpen}
                onOpenChange={(isOpen) => { setIsAllocationFormOpen(isOpen); if (!isOpen) { setEditingAllocation(null); }}}
                onSave={handleAllocationSave}
                allocation={editingAllocation}
            />

            <AlertDialog open={!!userToDelete} onOpenChange={(isOpen) => !isOpen && setUserToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {userToDelete?.status === 'invited' ? (<>This will permanently delete the invitation for <span className="font-bold">{userToDelete?.name}</span>. They will not be able to sign up.</>) 
                            : (<>This action cannot be undone. This will permanently delete the user account for <span className="font-bold">{userToDelete?.name}</span> from the user list. You can only delete users who have no water usage history.</>)}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmUserDelete} className={buttonVariants({ variant: "destructive" })}>Delete</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!allocationToDelete} onOpenChange={(isOpen) => !isOpen && setAllocationToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete this allocation period.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmAllocationDelete} className={buttonVariants({ variant: "destructive" })}>Delete</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={gapConfirmation.isOpen} onOpenChange={(isOpen) => !isOpen && setGapConfirmation({ isOpen: false, data: null, message: '' })}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Gap Detected in Allocations</AlertDialogTitle><AlertDialogDescription>{gapConfirmation.message}</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { if (gapConfirmation.data) { proceedWithSave(gapConfirmation.data); } setGapConfirmation({ isOpen: false, data: null, message: '' }); }}>Continue Anyway</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
