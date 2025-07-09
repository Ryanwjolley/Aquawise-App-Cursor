'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, Upload, Edit, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableCell, TableBody } from '@/components/ui/table';
import { addUsageEntry, getUsageForDateRange, getWeeklyAllocation, setWeeklyAllocation, getUsers, updateUser, inviteUser } from '../firestoreService';
import type { User } from '../firestoreService';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';
import { format, differenceInDays, startOfWeek, endOfWeek } from 'date-fns';
import { cn } from '@/lib/utils';
import { UserForm } from './user-form';
import { AllocationSuggester } from './allocation-suggester';

const DEFAULT_GALLONS_PER_SHARE = 2000;

type UserData = User & {
    used: number;
    allocation: number;
    percentageUsed: number;
    statusColor: string;
}

export default function AdminDashboard() {
    const [gallonsPerShare, setGallonsPerShare] = useState(DEFAULT_GALLONS_PER_SHARE);
    const [users, setUsers] = useState<User[]>([]);
    const [isUserFormOpen, setIsUserFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<UserData[]>([]);
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [date, setDate] = useState<DateRange | undefined>({
        from: startOfWeek(new Date(2025, 6, 6), { weekStartsOn: 0 }),
        to: endOfWeek(new Date(2025, 6, 6), { weekStartsOn: 0 }),
    });
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [month, setMonth] = useState<Date>(date?.from ?? new Date());

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const fetchedUsers = await getUsers();
                setUsers(fetchedUsers);
            } catch (error) {
                toast({
                    variant: 'destructive',
                    title: 'Failed to Fetch Users',
                    description: 'Could not load user data from the database.',
                });
            }
        };
        fetchUsers();
    }, [toast]);

    useEffect(() => {
        const fetchDataForWeek = async () => {
            if (date?.from && users.length > 0) {
                try {
                    const allocation = await getWeeklyAllocation(date.from);
                    setGallonsPerShare(allocation ?? DEFAULT_GALLONS_PER_SHARE);
                } catch (error) {
                     toast({
                        variant: 'destructive',
                        title: 'Fetch Failed',
                        description: 'Could not fetch weekly allocation data.',
                    });
                    setGallonsPerShare(DEFAULT_GALLONS_PER_SHARE);
                }
            }
        };

        fetchDataForWeek();
    }, [date, users, toast]);

    const handleDayClick = (day: Date) => {
        const weekStart = startOfWeek(day, { weekStartsOn: 0 });
        const weekEnd = endOfWeek(day, { weekStartsOn: 0 });
        setDate({ from: weekStart, to: weekEnd });
        setMonth(weekStart);
        setIsCalendarOpen(false);
    };

    const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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
                
                const userNameToIdMap = new Map(users.map(u => [u.name, u.id]));
                const usageEntries = [];
                let updatesMade = 0;

                for (const line of lines) {
                    if (!line.trim()) continue;
                    const [name, usedStr, dateStr] = line.split(',');
                    if (name && usedStr && dateStr) {
                        const trimmedName = name.trim();
                        const used = parseInt(usedStr.trim(), 10);
                        const trimmedDate = dateStr.trim();

                        if (userNameToIdMap.has(trimmedName) && !isNaN(used) && trimmedDate) {
                            const userId = userNameToIdMap.get(trimmedName)!;
                            usageEntries.push({ userId: userId, consumption: used, date: trimmedDate });
                            updatesMade++;
                        }
                    }
                }
                
                if (updatesMade > 0) {
                    await Promise.all(usageEntries.map(entry => addUsageEntry(entry)));
                    const updatedUsers = await getUsers();
                    setUsers(updatedUsers);
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
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        };
        reader.readAsText(file);
    };

    const handleUpdateAllocation = async () => {
        if (!date?.from) {
            toast({
                variant: 'destructive',
                title: 'No Date Selected',
                description: 'Please select a week to update the allocation.',
            });
            return;
        }
        try {
            await setWeeklyAllocation(date.from, gallonsPerShare);
            toast({
                title: 'Allocation Updated',
                description: `Set gallons per share to ${gallonsPerShare.toLocaleString()} for the selected week.`,
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Update Failed',
                description: 'Could not save the weekly allocation.',
            });
        }
    };
    
    const handleFormSave = async (formData: { name: string; email: string; shares: number; role: 'admin' | 'customer' }) => {
        try {
            if (editingUser) {
                await updateUser(editingUser.id, {name: formData.name, shares: formData.shares, role: formData.role});
                toast({ title: 'User Updated', description: `Updated details for ${formData.name}.` });
                const fetchedUsers = await getUsers();
                setUsers(fetchedUsers);
            } else {
                await inviteUser(formData);
                toast({ title: 'User Invited', description: `An invitation has been created for ${formData.email}.` });
            }
            setEditingUser(null);
        } catch (error) {
            const action = editingUser ? 'save' : 'invite';
             toast({
                variant: 'destructive',
                title: `${action.charAt(0).toUpperCase() + action.slice(1)} Failed`,
                description: `Could not ${action} user.`,
            });
        }
    };


    const totalUsers = useMemo(() => users.length, [users]);
    const totalWaterConsumed = useMemo(() => userData.reduce((acc, user) => acc + user.used, 0), [userData]);
    const averageUsagePerUser = useMemo(() => totalUsers > 0 ? totalWaterConsumed / totalUsers : 0, [totalWaterConsumed, totalUsers]);
    
    const totalWeeklyAllocation = useMemo(() => {
        const totalShares = users.reduce((acc, user) => acc + user.shares, 0);
        return totalShares * gallonsPerShare;
    }, [gallonsPerShare, users]);

    const periodDurationInDays = useMemo(() => {
        if (date?.from && date.to) {
            return differenceInDays(date.to, date.from) + 1;
        }
        return 7;
    }, [date]);


    useEffect(() => {
        const calculateUserData = async () => {
             if (!date?.from || !date?.to || users.length === 0) {
                setUserData(users.map(u => ({
                    ...u,
                    used: 0,
                    allocation: 0,
                    percentageUsed: 0,
                    statusColor: 'bg-green-500',
                })));
                return;
            }

            const userIds = users.map(u => u.id);
            const usageDataById = await getUsageForDateRange(userIds, date.from, date.to);

            const data = users.map(user => {
                const used = usageDataById[user.id] || 0;
                const weeklyAllocation = user.shares * gallonsPerShare;
                const periodAllocation = (weeklyAllocation / 7) * periodDurationInDays;
                const percentageUsed = periodAllocation > 0 ? Math.round((used / periodAllocation) * 100) : 0;
                let statusColor = 'bg-green-500';
                if (percentageUsed > 100) {
                    statusColor = 'bg-red-500';
                } else if (percentageUsed > 80) {
                    statusColor = 'bg-yellow-500';
                }
                return { ...user, used, allocation: Math.round(periodAllocation), percentageUsed, statusColor };
            });
            setUserData(data);
        }
        calculateUserData();

    }, [gallonsPerShare, users, date, periodDurationInDays]);
    
    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <header className="flex flex-col sm:flex-row justify-between sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Water Master Dashboard</h1>
                    <p className="text-muted-foreground">Manti Irrigation Company</p>
                </div>
                <div className="flex items-center gap-4">
                 <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
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
                        onDayClick={handleDayClick}
                        numberOfMonths={2}
                        onMonthChange={setMonth}
                        month={month}
                        />
                    </PopoverContent>
                </Popover>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="rounded-xl shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{totalUsers}</p>
                    </CardContent>
                </Card>
                <Card className="rounded-xl shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Allocation for Period</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{((totalWeeklyAllocation/7*periodDurationInDays) / 1000).toFixed(0)}K <span className="text-lg font-normal text-muted-foreground">gal</span></p>
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
            </div>

            <Card className="mb-8 rounded-xl shadow-md">
                <CardHeader>
                    <CardTitle className="text-xl">Weekly Allocation Management</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row items-end gap-4">
                        <div className="flex-grow w-full">
                            <label htmlFor="gallons-per-share" className="block text-sm font-medium text-foreground mb-1">Gallons per Share this Week</label>
                            <Input
                                type="number"
                                id="gallons-per-share"
                                value={gallonsPerShare}
                                onChange={(e) => setGallonsPerShare(Number(e.target.value))}
                                placeholder="e.g. 2000"
                            />
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto flex-shrink-0 flex-wrap">
                            <Button className="w-full sm:w-auto" onClick={handleUpdateAllocation}>
                                Update Allocations
                            </Button>
                            <AllocationSuggester
                                totalUsers={totalUsers}
                                totalWeeklyAllocation={totalWeeklyAllocation}
                                totalWaterConsumed={totalWaterConsumed}
                                averageUsagePerUser={averageUsagePerUser}
                                currentGallonsPerShare={gallonsPerShare}
                                onSuggestionAccept={(suggestion) => setGallonsPerShare(suggestion)}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="rounded-xl shadow-md overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-xl">User Water Management</CardTitle>
                    </div>
                    <div className='flex items-center gap-2'>
                        <Button variant="outline" onClick={() => { setEditingUser(null); setIsUserFormOpen(true); }}>
                           <UserPlus className="mr-2 h-4 w-4" />
                           Invite User
                        </Button>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
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
                            ref={fileInputRef}
                            type="file"
                            id="csv-upload"
                            className="hidden"
                            accept=".csv"
                            onChange={handleCsvUpload}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="w-full overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-16">Status</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Shares</TableHead>
                                    <TableHead>Allocated (gal)</TableHead>
                                    <TableHead>Used (gal)</TableHead>
                                    <TableHead>% Used</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {userData.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <span className={`h-4 w-4 rounded-full ${user.statusColor} inline-block`} title={`${user.percentageUsed}% used`}></span>
                                        </TableCell>
                                        <TableCell className="font-medium">{user.name}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell className="capitalize">{user.role}</TableCell>
                                        <TableCell>{user.shares}</TableCell>
                                        <TableCell>{user.allocation.toLocaleString()}</TableCell>
                                        <TableCell>{user.used.toLocaleString()}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3 min-w-[150px]">
                                                <span className="text-sm font-medium text-muted-foreground">{user.percentageUsed}%</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => { setEditingUser(user); setIsUserFormOpen(true); }}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

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
        </div>
    );
}
