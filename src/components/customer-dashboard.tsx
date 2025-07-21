
'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Droplets, LineChart, Scale, Users, TrendingUp } from 'lucide-react';
import DailyUsageChart from './daily-usage-chart';
import UsageDonutChart from './usage-donut-chart';
import { getDailyUsageForDateRange, User, getUsers, getTotalUsageForDateRange, getUsageEntriesForDateRange, UsageEntry } from '@/firestoreService';
import type { DateRange } from 'react-day-picker';
import { differenceInMinutes, differenceInSeconds, format, subDays } from 'date-fns';
import { convertAndFormat } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUnit } from '@/context/unit-context';
import { Label } from './ui/label';
import { DateRangeSelector } from './date-range-selector';
import { Table, TableHeader, TableRow, TableHead, TableCell, TableBody } from '@/components/ui/table';

export default function CustomerDashboard() {
  const { userDetails, loading: authLoading, impersonatingUser } = useAuth();
  const { unit, setUnit, getUnitLabel } = useUnit();

  const [date, setDate] = useState<DateRange | undefined>(() => {
    const to = new Date();
    const from = subDays(to, 30);
    return { from, to };
  });
  
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [loading, setLoading] = useState(true);
  const [waterUsed, setWaterUsed] = useState(0);
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);
  const [usageEntries, setUsageEntries] = useState<UsageEntry[]>([]);
  const { toast } = useToast();

  const customerUsersForDropdown = useMemo(() => {
    if (userDetails?.role === 'admin') {
      return allUsers.filter(u => u.companyId === userDetails.companyId && u.role === 'customer');
    }
    return [];
  }, [allUsers, userDetails]);

  // Main data fetching and initialization hook
  useEffect(() => {
    const initializeDashboard = async () => {
      const companyId = impersonatingUser?.companyId || userDetails?.companyId;
      if (!companyId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const fetchedUsers = await getUsers(companyId);
        setAllUsers(fetchedUsers);
        
        let userToDisplay: User | null = null;
        if (impersonatingUser) {
          userToDisplay = impersonatingUser;
        } else if (userDetails) {
          if (userDetails.role === 'admin') {
            const customers = fetchedUsers.filter(u => u.role === 'customer');
            if (customers.length > 0) {
              userToDisplay = customers[0];
            }
          } else {
            userToDisplay = userDetails;
          }
        }
        setSelectedUser(userToDisplay);

      } catch (error) {
        console.error("Error during initialization:", error);
        toast({
          variant: 'destructive',
          title: 'Failed to fetch initial data',
          description: 'Could not load required user data.',
        });
      } finally {
        setLoading(false);
      }
    };

    initializeDashboard();
  }, [userDetails, impersonatingUser, toast]);


  // Effect to fetch period-specific data whenever the date or selected user changes
  useEffect(() => {
    const fetchPeriodData = async () => {
      if (!date?.from || !date?.to || !selectedUser || !selectedUser.companyId) {
        setDailyUsage([]);
        setWaterUsed(0);
        setUsageEntries([]);
        if (allUsers.length > 0) setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const [dailyData, totalUsed, entries] = await Promise.all([
          getDailyUsageForDateRange(selectedUser.id, selectedUser.companyId, date.from, date.to),
          getTotalUsageForDateRange(selectedUser.id, selectedUser.companyId, date.from, date.to),
          getUsageEntriesForDateRange(selectedUser.id, selectedUser.companyId, date.from, date.to)
        ]);
        
        setDailyUsage(dailyData);
        setWaterUsed(totalUsed);
        setUsageEntries(entries);

      } catch (error) {
        console.error("Error fetching period data:", error);
        toast({
          variant: 'destructive',
          title: 'Data Fetch Failed',
          description: 'Could not fetch your usage data for this period.',
        });
        setWaterUsed(0);
        setDailyUsage([]);
        setUsageEntries([]);
      } finally {
        setLoading(false);
      }
    };

    if (selectedUser) {
        fetchPeriodData();
    }
  }, [date, selectedUser, toast]);
  
  const handleUserChange = (userId: string) => {
    const userToView = allUsers.find(u => u.id === userId);
    if (userToView) {
      setSelectedUser(userToView);
    }
  };
  
  const welcomeMessage = impersonatingUser 
    ? `Viewing as: ${impersonatingUser.name}`
    : userDetails?.role === 'admin'
    ? 'Customer View'
    : `Welcome, ${userDetails?.name || 'User'}`;
    
  const subMessage = impersonatingUser
    ? `You are viewing ${impersonatingUser.name}'s dashboard.`
    : userDetails?.role === 'admin' 
    ? 'Select a customer to view their summary.'
    : "Here's your water usage summary.";


  if (authLoading || (loading && dailyUsage.length === 0)) {
      return (
          <div className="p-4 sm:p-6 lg:p-8">
              <header className="flex flex-col sm:flex-row justify-between sm:items-end mb-8 gap-4">
                  <div>
                      <h1 className="text-3xl font-bold text-foreground"><Skeleton className="h-9 w-64" /></h1>
                      <div className="text-muted-foreground mt-2"><Skeleton className="h-5 w-80" /></div>
                  </div>
              </header>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <Card className="rounded-xl shadow-md"><CardContent className="p-6"><Skeleton className="h-[88px] w-full" /></CardContent></Card>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="lg:col-span-3 rounded-xl shadow-md">
                      <CardHeader><CardTitle className="text-xl"><Skeleton className="h-6 w-1/3" /></CardTitle></CardHeader>
                      <CardContent className="h-80"><Skeleton className="w-full h-full" /></CardContent>
                  </Card>
              </div>
          </div>
      );
  }
  
  if (userDetails?.role === 'admin' && !impersonatingUser && customerUsersForDropdown.length === 0) {
       return (
          <div className="p-8">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground">Customer View</h1>
                    <p className="text-muted-foreground">There are no customers in this company to display.</p>
                </header>
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
        <div className="flex flex-col sm:flex-row items-end gap-4">
          {userDetails?.role === 'admin' && !impersonatingUser && customerUsersForDropdown.length > 0 && (
            <div className="flex flex-col gap-1 w-full sm:w-auto">
                <Label>Viewing Customer</Label>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <Select onValueChange={handleUserChange} value={selectedUser?.id}>
                      <SelectTrigger className="w-full sm:w-[200px]">
                          <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                      <SelectContent>
                          {customerUsersForDropdown.map((user) => (
                              <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
                </div>
            </div>
          )}
           <div>
            <Label>Display Units</Label>
            <Select onValueChange={(value) => setUnit(value as 'gallons' | 'acre-feet')} value={unit}>
                <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="gallons">Gallons</SelectItem>
                    <SelectItem value="acre-feet">Acre-Feet</SelectItem>
                </SelectContent>
            </Select>
          </div>
          <DateRangeSelector
              date={date}
              setDate={setDate}
          />
        </div>
      </header>
        
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="rounded-xl shadow-md col-span-1 md:col-span-2 lg:col-span-4">
              <CardContent className="p-6 flex items-center space-x-4">
                  <div className="bg-green-100 p-4 rounded-full">
                      <LineChart className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                  <p className="text-sm text-muted-foreground">Total Water Used for Period</p>
                  <p className="text-3xl font-bold text-foreground">{convertAndFormat(waterUsed, unit)} <span className="text-lg font-normal text-muted-foreground">{getUnitLabel()}</span></p>
                  </div>
              </CardContent>
          </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-3 rounded-xl shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">Daily Usage ({getUnitLabel()})</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <DailyUsageChart data={dailyUsage} unit={unit} unitLabel={getUnitLabel()} />
          </CardContent>
        </Card>
      </div>
      <div className="mt-6">
        <Card className="rounded-xl shadow-md">
            <CardHeader>
                <CardTitle>Usage Data Log</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead className="text-right">Consumption ({getUnitLabel()})</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {usageEntries.length > 0 ? (
                            usageEntries.map((entry) => (
                                <TableRow key={entry.id}>
                                    <TableCell>{format(entry.date, 'PPP')}</TableCell>
                                    <TableCell>{format(entry.date, 'p')}</TableCell>
                                    <TableCell className="text-right">{convertAndFormat(entry.consumption, unit)}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                                    No usage data for the selected period.
                                </TableCell>
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
