
'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LineChart, Users, Droplets, BarChart, CheckCircle } from 'lucide-react';
import { User, getUsers, getDailyUsageForDateRange, DailyUsage, UsageEntry, getUsageEntriesForDateRange, getTotalUsageForDateRange } from '@/firestoreService';
import type { DateRange } from 'react-day-picker';
import { subDays } from 'date-fns';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUnit } from '@/context/unit-context';
import { Label } from './ui/label';
import { DateRangeSelector } from './date-range-selector';
import { convertAndFormat } from '@/lib/utils';
import DailyUsageChart from './daily-usage-chart';
import { Table, TableHeader, TableRow, TableHead, TableCell, TableBody } from '@/components/ui/table';

export default function CustomerDashboard() {
  const { userDetails, loading: authLoading, impersonatingUser, companyDetails, impersonatedCompanyDetails, impersonatingCompanyId } = useAuth();
  const { unit, setUnit, getUnitLabel } = useUnit();

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dailyData, setDailyData] = useState<DailyUsage[]>([]);
  const [usageEntries, setUsageEntries] = useState<UsageEntry[]>([]);
  const [totalUsed, setTotalUsed] = useState(0);

  const [date, setDate] = useState<DateRange | undefined>(() => {
    const to = new Date();
    const from = subDays(to, 30);
    return { from, to };
  });

  const [loading, setLoading] = useState(true);
  const [loadingChartData, setLoadingChartData] = useState(false);
  const { toast } = useToast();

  const activeCompanyId = impersonatingCompanyId || userDetails?.companyId;

  // Effect to fetch the list of all users for the company
  useEffect(() => {
    const fetchUsers = async () => {
      if (!activeCompanyId) return;
      setLoading(true);
      try {
        const users = await getUsers(activeCompanyId);
        setAllUsers(users);

        // Determine the initial user to display
        if (impersonatingUser) {
          setSelectedUser(impersonatingUser);
        } else if (userDetails?.role === 'customer') {
          setSelectedUser(userDetails);
        } else if (users.length > 0) {
          setSelectedUser(users[0]);
        } else {
          setLoading(false);
        }
      } catch (error) {
        toast({ variant: 'destructive', title: 'Failed to fetch users' });
        setLoading(false);
      }
    };
    fetchUsers();
  }, [activeCompanyId, userDetails, impersonatingUser, toast]);

  // Effect to fetch data when user or date range changes
  useEffect(() => {
    const fetchUsageData = async () => {
      if (!selectedUser || !date?.from || !date.to || !activeCompanyId) {
        setDailyData([]);
        setUsageEntries([]);
        setTotalUsed(0);
        return;
      }
      setLoadingChartData(true);
      try {
        const [daily, entries, total] = await Promise.all([
            getDailyUsageForDateRange(selectedUser.id, activeCompanyId, date.from, date.to),
            getUsageEntriesForDateRange(selectedUser.id, activeCompanyId, date.from, date.to),
            getTotalUsageForDateRange(selectedUser.id, activeCompanyId, date.from, date.to),
        ]);
        setDailyData(daily);
        setUsageEntries(entries);
        setTotalUsed(total);
      } catch (error) {
        toast({ variant: 'destructive', title: 'Data Fetch Failed', description: 'Could not load usage data for the selected period.' });
      } finally {
        setLoadingChartData(false);
        setLoading(false);
      }
    };

    if (!loading) { // Ensure users have been loaded first
        fetchUsageData();
    }
  }, [selectedUser, date, activeCompanyId, toast, loading]);
  
  const handleUserChange = (userId: string) => {
    const user = allUsers.find(u => u.id === userId);
    if (user) {
        setSelectedUser(user);
    }
  };

  const isCustomerView = userDetails?.role === 'customer' && !impersonatingUser;

  const welcomeMessage = isCustomerView
    ? `Welcome, ${userDetails?.name}`
    : impersonatingUser
    ? `Viewing as: ${impersonatingUser.name}`
    : selectedUser
    ? `Viewing as: ${selectedUser.name}`
    : 'Customer Dashboard';
    
  const subMessage = isCustomerView
    ? "Here's your water usage summary."
    : 'Select a customer to view their summary.';


  if (loading) {
      return (
          <div className="p-4 sm:p-6 lg:p-8">
              <header className="flex flex-col sm:flex-row justify-between sm:items-end mb-8 gap-4">
                  <div>
                      <div className="text-3xl font-bold text-foreground"><Skeleton className="h-9 w-64" /></div>
                      <div className="text-muted-foreground mt-2"><Skeleton className="h-5 w-80" /></div>
                  </div>
              </header>
              <div className="space-y-6">
                <Card><CardHeader><CardTitle><Skeleton className="h-6 w-48" /></CardTitle></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>
                <Card><CardHeader><CardTitle><Skeleton className="h-6 w-48" /></CardTitle></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>
              </div>
          </div>
      );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col sm:flex-row justify-between sm:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{welcomeMessage}</h1>
          <p className="text-muted-foreground">{subMessage}</p>
        </div>
        {!isCustomerView && (
            <div className="flex items-end gap-4">
                <div className="flex flex-col gap-1">
                    <Label>Select User</Label>
                    <Select onValueChange={handleUserChange} value={selectedUser?.id}>
                        <SelectTrigger className="w-full sm:w-[280px]">
                            <SelectValue placeholder="Select a user" />
                        </SelectTrigger>
                        <SelectContent>
                            {allUsers.filter(u => u.status === 'active').map(user => (
                                <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        )}
      </header>
        
      <div className="space-y-6">
        <Card className="rounded-xl shadow-md">
            <CardHeader className='flex-row items-center justify-between'>
                <div>
                    <CardTitle className="text-xl">Usage Summary</CardTitle>
                    <CardDescription>Key metrics for the selected period.</CardDescription>
                </div>
                <div className='flex items-center gap-4'>
                    <div className="flex items-center gap-2">
                        <Label htmlFor="unit-select">Units</Label>
                        <Select onValueChange={(value) => setUnit(value as 'gallons' | 'acre-feet')} value={unit}>
                            <SelectTrigger className="w-[120px]" id="unit-select"><SelectValue placeholder="Select unit" /></SelectTrigger>
                            <SelectContent><SelectItem value="gallons">Gallons</SelectItem><SelectItem value="acre-feet">Acre-Feet</SelectItem></SelectContent>
                        </Select>
                    </div>
                    <DateRangeSelector date={date} setDate={setDate} />
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card className="rounded-lg">
                        <CardHeader className="pb-2 flex-row items-center justify-between"><CardTitle className="text-sm font-medium">Water Used</CardTitle><Droplets className="h-4 w-4 text-primary" /></CardHeader>
                        <CardContent>{loadingChartData ? <Skeleton className="h-7 w-2/3" /> : <p className="text-2xl font-bold">{convertAndFormat(totalUsed, unit)} <span className="text-base font-normal text-muted-foreground">{getUnitLabel()}</span></p>}</CardContent>
                    </Card>
                    <Card className="rounded-lg">
                        <CardHeader className="pb-2 flex-row items-center justify-between"><CardTitle className="text-sm font-medium">User Shares</CardTitle><BarChart className="h-4 w-4 text-muted-foreground" /></CardHeader>
                        <CardContent><p className="text-2xl font-bold">{selectedUser?.shares.toLocaleString() || 'N/A'}</p></CardContent>
                    </Card>
                     <Card className="rounded-lg">
                        <CardHeader className="pb-2 flex-row items-center justify-between"><CardTitle className="text-sm font-medium">User Status</CardTitle><CheckCircle className="h-4 w-4 text-muted-foreground" /></CardHeader>
                        <CardContent><p className="text-2xl font-bold capitalize">{selectedUser?.status || 'N/A'}</p></CardContent>
                    </Card>
                </div>
            </CardContent>
        </Card>

        <Card className="rounded-xl shadow-md">
            <CardHeader><CardTitle className="text-xl">Daily Usage</CardTitle><CardDescription>Water consumption for each day in the selected period.</CardDescription></CardHeader>
            <CardContent className="h-[300px]">
                {loadingChartData ? (
                    <div className="w-full h-full flex items-center justify-center"><Skeleton className="h-full w-full" /></div>
                ) : dailyData.length > 0 ? (
                    <DailyUsageChart data={dailyData} unit={unit} unitLabel={getUnitLabel()} />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">No usage data for this period.</div>
                )}
            </CardContent>
        </Card>

        <Card className="rounded-xl shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">Usage Log</CardTitle>
            <CardDescription>A detailed log of all water usage entries in the selected period.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Consumption ({getUnitLabel()})</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingChartData ? (
                  Array.from({length: 5}).map((_, i) => (
                    <TableRow key={`log-skel-${i}`}>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : usageEntries.length > 0 ? (
                  usageEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.date.toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">{convertAndFormat(entry.consumption, unit)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center h-24 text-muted-foreground">No usage entries found for this period.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
