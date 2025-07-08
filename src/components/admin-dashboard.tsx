'use client';
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { CalendarDays } from 'lucide-react';
import { AllocationSuggester } from './allocation-suggester';

const mockUsers = [
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
    const [userData, setUserData] = useState<UserData[]>([]);

    const totalUsers = useMemo(() => mockUsers.length, []);
    const totalWaterConsumed = useMemo(() => mockUsers.reduce((acc, user) => acc + user.used, 0), []);
    const averageUsagePerUser = useMemo(() => totalWaterConsumed / totalUsers, [totalWaterConsumed, totalUsers]);
    
    const totalWeeklyAllocation = useMemo(() => {
        const totalShares = mockUsers.reduce((acc, user) => acc + user.shares, 0);
        return totalShares * gallonsPerShare;
    }, [gallonsPerShare]);

    useEffect(() => {
        const data = mockUsers.map(user => {
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
    }, [gallonsPerShare]);
    
    return (
        <div>
            <header className="flex flex-col sm:flex-row justify-between sm:items-center mb-8 gap-4">
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
                <CardHeader>
                    <CardTitle className="text-xl">User Water Management</CardTitle>
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
                                                <Progress value={user.percentageUsed} className="w-24 h-2.5" />
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
