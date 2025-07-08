'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableCell, TableBody } from '@/components/ui/table';
import { AllocationSuggester } from './allocation-suggester';
import { addUsageEntry } from '../firestoreService';
import { useToast } from '@/hooks/use-toast';

const initialUsers = [
    { name: 'John Farmer', shares: 5, used: 7500 },
    { name: 'Alice Gardener', shares: 3, used: 6100 },
    { name: 'Bob Rancher', shares: 10, used: 18500 },
    { name: 'Cathy Fields', shares: 8, used: 10000 },
    { name: 'David Croft', shares: 2, used: 4200 },
    { name: 'Emily Acres', shares: 6, used: 12300 },
];

type UserData = {
    name: string;
    shares: number;
    used: number;
    allocation: number;
    percentageUsed: number;
    statusColor: string;
}

export default function AdminDashboard() {
    const [gallonsPerShare, setGallonsPerShare] = useState(2000);
    const [users, setUsers] = useState(initialUsers);
    const [userData, setUserData] = useState<UserData[]>([]);
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [consumption, setConsumption] = useState<number>(0);
    const adminUserId = "adminUserId";

    const handleAddUsage = async () => {
        const currentDate = new Date().toISOString().slice(0, 10);
        const newUsageEntry = { userId: adminUserId, date: currentDate, consumption };

        try {
            await addUsageEntry(newUsageEntry);
            toast({ title: "Success", description: "Usage entry added successfully!" });
        } catch (error) {
            console.error("Error adding usage entry:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to add usage entry." });
        }
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
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const lines = text.split(/\r\n|\n/).slice(1);
                
                const userMap = new Map(users.map(u => [u.name, {...u}]));
                let updatesMade = 0;

                lines.forEach(line => {
                    if (!line.trim()) return;
                    const [name, usedStr] = line.split(',');
                    if (name && usedStr) {
                        const trimmedName = name.trim();
                        const used = parseInt(usedStr.trim(), 10);

                        if (userMap.has(trimmedName) && !isNaN(used)) {
                            const user = userMap.get(trimmedName)!;
                            user.used = used;
                            userMap.set(trimmedName, user);
                            updatesMade++;
                        }
                    }
                });
                
                if (updatesMade > 0) {
                    setUsers(Array.from(userMap.values()));
                    toast({
                        title: 'Upload Successful',
                        description: `Updated usage for ${updatesMade} user(s).`,
                    });
                } else {
                     toast({
                        variant: 'destructive',
                        title: 'No Updates Made',
                        description: 'CSV data did not match any existing users or was invalid.',
                    });
                }
            } catch (error) {
                 toast({
                    variant: 'destructive',
                    title: 'Error Processing File',
                    description: 'Could not parse the CSV file. Please check the format.',
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

    const totalUsers = useMemo(() => users.length, [users]);
    const totalWaterConsumed = useMemo(() => users.reduce((acc, user) => acc + user.used, 0), [users]);
    const averageUsagePerUser = useMemo(() => totalWaterConsumed / totalUsers, [totalWaterConsumed, totalUsers]);
    
    const totalWeeklyAllocation = useMemo(() => {
        const totalShares = users.reduce((acc, user) => acc + user.shares, 0);
        return totalShares * gallonsPerShare;
    }, [gallonsPerShare, users]);

    useEffect(() => {
        const data = users.map(user => {
            const allocation = user.shares * gallonsPerShare;
            const percentageUsed = allocation > 0 ? Math.round((user.used / allocation) * 100) : 0;
            let statusColor = 'bg-green-500';
            if (percentageUsed > 100) {
                statusColor = 'bg-red-500';
            } else if (percentageUsed > 80) {
                statusColor = 'bg-yellow-500';
            }
            return { ...user, allocation, percentageUsed, statusColor };
        });
        setUserData(data);
    }, [gallonsPerShare, users]);
    
    return (
        <div>
            <div>
                <Input
                  type="number"
                  value={consumption}
                  onChange={(e) => setConsumption(Number(e.target.value))}
                  placeholder="Enter water usage"
                  className="inline-block w-auto mr-2"
                />
                <Button onClick={handleAddUsage}>
                  Log Water Usage (Admin)
                </Button>
            </div>

            <header className="flex flex-col sm:flex-row justify-between sm:items-center my-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Water Master Dashboard</h1>
                    <p className="text-muted-foreground">Manti Irrigation Company</p>
                </div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <CalendarDays className="h-4 w-4" />
                    <span>Week: July 6 - July 12, 2025</span>
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
                        <CardTitle className="text-sm font-medium">Total Weekly Allocation</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{(totalWeeklyAllocation / 1000).toFixed(0)}K <span className="text-lg font-normal text-muted-foreground">gal</span></p>
                    </CardContent>
                </Card>
                <Card className="rounded-xl shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Water Consumed</CardTitle>
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
                        <div className="flex gap-2 w-full sm:w-auto flex-shrink-0">
                            <Button className="w-full sm:w-auto">
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
                    <CardTitle className="text-xl">User Water Management</CardTitle>
                    <div>
                        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Usage CSV
                        </Button>
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
                                    <TableHead>Shares</TableHead>
                                    <TableHead>Allocated (gal)</TableHead>
                                    <TableHead>Used (gal)</TableHead>
                                    <TableHead>% Used</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {userData.map((user) => (
                                    <TableRow key={user.name}>
                                        <TableCell>
                                            <span className={`h-4 w-4 rounded-full ${user.statusColor} inline-block`} title={`${user.percentageUsed}% used`}></span>
                                        </TableCell>
                                        <TableCell className="font-medium">{user.name}</TableCell>
                                        <TableCell>{user.shares}</TableCell>
                                        <TableCell>{user.allocation.toLocaleString()}</TableCell>
                                        <TableCell>{user.used.toLocaleString()}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3 min-w-[150px]">
                                                <span className="text-sm font-medium text-muted-foreground">{user.percentageUsed}%</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}