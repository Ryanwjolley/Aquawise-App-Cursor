
'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Droplets, LineChart, Scale, Users, TrendingUp } from 'lucide-react';
import DailyUsageChart from './daily-usage-chart';
import UsageDonutChart from './usage-donut-chart';
import { getAllocationsForPeriod, getDailyUsageForDateRange, DailyUsage, User, getUsers, getAllocations, Allocation, getTotalUsageForDateRange } from '@/firestoreService';
import type { DateRange } from 'react-day-picker';
import { differenceInMinutes, differenceInSeconds } from 'date-fns';
import { convertAndFormat, GALLONS_PER_CUBIC_FOOT } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUnit } from '@/context/unit-context';
import { Label } from './ui/label';
import { DateRangeSelector } from './date-range-selector';

export default function CustomerDashboard() {
  const { userDetails, loading: authLoading, impersonatingUser } = useAuth();
  const { unit, setUnit, getUnitLabel } = useUnit();
  const [flowUnit, setFlowUnit] = useState<'gpm' | 'cfs'>('gpm');

  const [date, setDate] = useState<DateRange | undefined>(undefined);
  
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [loading, setLoading] = useState(true);
  const [totalPeriodAllocation, setTotalPeriodAllocation] = useState(0);
  const [waterUsed, setWaterUsed] = useState(0);
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);
  const [allTimeAllocations, setAllTimeAllocations] = useState<Allocation[]>([]);
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

      console.log('--- Initializing Dashboard ---');
      setLoading(true);
      try {
        // 1. Fetch company-wide data first
        const [fetchedUsers, fetchedAllocations] = await Promise.all([
          getUsers(companyId),
          getAllocations(companyId)
        ]);
        console.log('Fetched all users:', fetchedUsers);
        console.log('Fetched all-time allocations:', fetchedAllocations);
        setAllUsers(fetchedUsers);
        setAllTimeAllocations(fetchedAllocations);

        // 2. Determine the user to display
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
        console.log('User to display:', userToDisplay);
        setSelectedUser(userToDisplay);

      } catch (error) {
        console.error("Error during initialization:", error);
        toast({
          variant: 'destructive',
          title: 'Failed to fetch initial data',
          description: 'Could not load required user and allocation data.',
        });
        setLoading(false);
      }
    };

    initializeDashboard();
  }, [userDetails, impersonatingUser, toast]);


  // Effect to fetch period-specific data whenever the date or selected user changes
  useEffect(() => {
    const fetchPeriodData = async () => {
      if (!date?.from || !date?.to || !selectedUser || !selectedUser.companyId || allUsers.length === 0) {
        setDailyUsage([]);
        setWaterUsed(0);
        setTotalPeriodAllocation(0);
        if (allUsers.length > 0) setLoading(false);
        return;
      }
      
      console.log(`--- Fetching Period Data ---`);
      console.log('Selected User:', selectedUser.name, `(${selectedUser.id})`);
      console.log('Date Range:', date);

      setLoading(true);
      try {
        const allocations = await getAllocationsForPeriod(selectedUser.companyId, date.from, date.to);
        console.log('Fetched allocations for period:', allocations);
        
        const totalSystemAllocationForPeriod = allocations.reduce((sum, alloc) => sum + alloc.totalAllocationGallons, 0);
        console.log('Total System Allocation for Period (Gallons):', totalSystemAllocationForPeriod);

        const activeUsersInCompany = allUsers.filter(u => u.status === 'active' && u.companyId === selectedUser.companyId);
        const totalSystemShares = activeUsersInCompany.reduce((acc, user) => acc + user.shares, 0);
        console.log('Total System Shares:', totalSystemShares);

        if (totalSystemShares > 0) {
          const userAllocation = totalSystemAllocationForPeriod * (selectedUser.shares / totalSystemShares);
          setTotalPeriodAllocation(userAllocation);
          console.log('Calculated User Allocation:', userAllocation);
        } else {
          setTotalPeriodAllocation(0);
          console.log('Total system shares is 0, setting user allocation to 0.');
        }

        const [dailyData, totalUsed] = await Promise.all([
          getDailyUsageForDateRange(selectedUser.id, selectedUser.companyId, date.from, date.to),
          getTotalUsageForDateRange(selectedUser.id, selectedUser.companyId, date.from, date.to)
        ]);
        
        console.log('Fetched Daily Usage Data:', dailyData);
        console.log('Fetched Total Water Used:', totalUsed);

        setDailyUsage(dailyData);
        setWaterUsed(totalUsed);

      } catch (error) {
        console.error("Error fetching period data:", error);
        toast({
          variant: 'destructive',
          title: 'Data Fetch Failed',
          description: 'Could not fetch your usage data for this period.',
        });
        setTotalPeriodAllocation(0);
        setWaterUsed(0);
        setDailyUsage([]);
      } finally {
        setLoading(false);
        console.log('--- Finished Fetching Period Data ---');
      }
    };

    fetchPeriodData();
  }, [date, selectedUser, allUsers, toast]);
  
  const handleUserChange = (userId: string) => {
    const userToView = allUsers.find(u => u.id === userId);
    if (userToView) {
      setSelectedUser(userToView);
    }
  };

  const remaining = totalPeriodAllocation - waterUsed;
  const usagePercentage = totalPeriodAllocation > 0 ? Math.round((waterUsed / totalPeriodAllocation) * 100) : 0;
  
  const averageFlow = () => {
    if (!date?.from || !date?.to || totalPeriodAllocation === 0) return 0;
    
    if (flowUnit === 'gpm') {
        const minutes = differenceInMinutes(date.to, date.from);
        if (minutes === 0) return 0;
        return totalPeriodAllocation / minutes; // GPM
    }
    
    if (flowUnit === 'cfs') {
        const seconds = differenceInSeconds(date.to, date.from);
        if (seconds === 0) return 0;
        const cubicFeet = totalPeriodAllocation / GALLONS_PER_CUBIC_FOOT;
        return cubicFeet / seconds; // CFS
    }

    return 0;
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


  if (authLoading || loading) {
      return (
          <div className="p-8">
              <header className="flex flex-col sm:flex-row justify-between sm:items-end mb-8 gap-4">
                  <div>
                      <h1 className="text-3xl font-bold text-foreground"><Skeleton className="h-9 w-64" /></h1>
                      <p className="text-muted-foreground"><Skeleton className="h-5 w-80 mt-2" /></p>
                  </div>
              </header>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <Card className="rounded-xl shadow-md"><CardContent className="p-6"><Skeleton className="h-[88px] w-full" /></CardContent></Card>
                  <Card className="rounded-xl shadow-md"><CardContent className="p-6"><Skeleton className="h-[88px] w-full" /></CardContent></Card>
                  <Card className="rounded-xl shadow-md"><CardContent className="p-6"><Skeleton className="h-[88px] w-full" /></CardContent></Card>
                  <Card className="rounded-xl shadow-md"><CardContent className="p-6"><Skeleton className="h-[88px] w-full" /></CardContent></Card>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="lg:col-span-2 rounded-xl shadow-md">
                      <CardHeader><CardTitle className="text-xl"><Skeleton className="h-6 w-1/3" /></CardTitle></CardHeader>
                      <CardContent className="h-80"><Skeleton className="w-full h-full" /></CardContent>
                  </Card>
                  <div className="space-y-6">
                      <Card className="rounded-xl shadow-md">
                          <CardHeader><CardTitle className="text-xl"><Skeleton className="h-6 w-1/2" /></CardTitle></CardHeader>
                          <CardContent><div className="flex flex-col items-center"><Skeleton className="w-48 h-48 rounded-full" /><Skeleton className="h-5 w-3/4 mt-6" /></div></CardContent>
                      </Card>
                  </div>
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
              allocations={allTimeAllocations}
          />
        </div>
      </header>
        
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="rounded-xl shadow-md">
          <CardContent className="p-6 flex items-center space-x-4">
              <div className="bg-blue-100 p-4 rounded-full">
              <Droplets className="h-6 w-6 text-blue-500" />
              </div>
              <div>
              <p className="text-sm text-muted-foreground">Period Allocation</p>
              <p className="text-3xl font-bold text-foreground">{convertAndFormat(totalPeriodAllocation, unit)} <span className="text-lg font-normal text-muted-foreground">{getUnitLabel()}</span></p>
              </div>
          </CardContent>
          </Card>
          <Card className="rounded-xl shadow-md">
          <CardContent className="p-6 flex items-center space-x-4">
              <div className="bg-green-100 p-4 rounded-full">
                  <LineChart className="h-6 w-6 text-green-500" />
              </div>
              <div>
              <p className="text-sm text-muted-foreground">Water Used</p>
              <p className="text-3xl font-bold text-foreground">{convertAndFormat(waterUsed, unit)} <span className="text-lg font-normal text-muted-foreground">{getUnitLabel()}</span></p>
              </div>
          </CardContent>
          </Card>
          <Card className="rounded-xl shadow-md">
          <CardContent className="p-6 flex items-center space-x-4">
              <div className="bg-yellow-100 p-4 rounded-full">
                  <Scale className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
              <p className="text-sm text-muted-foreground">Remaining</p>
              <p className="text-3xl font-bold text-foreground">{convertAndFormat(remaining, unit)} <span className="text-lg font-normal text-muted-foreground">{getUnitLabel()}</span></p>
              </div>
          </CardContent>
          </Card>
          <Card className="rounded-xl shadow-md">
              <CardContent className="p-6 flex flex-col justify-between h-full">
                  <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-4">
                            <div className="bg-purple-100 p-4 rounded-full">
                              <TrendingUp className="h-6 w-6 text-purple-500" />
                          </div>
                          <div>
                              <p className="text-sm text-muted-foreground">Average Flow for Period</p>
                              <p className="text-3xl font-bold text-foreground">{averageFlow().toFixed(2)}</p>
                          </div>
                      </div>
                      <Select onValueChange={(value) => setFlowUnit(value as 'gpm' | 'cfs')} value={flowUnit}>
                          <SelectTrigger className="w-[80px] h-8 text-xs">
                              <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="gpm">GPM</SelectItem>
                              <SelectItem value="cfs">CFS</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
              </CardContent>
          </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 rounded-xl shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">Daily Usage ({getUnitLabel()})</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <DailyUsageChart data={dailyUsage} unit={unit} unitLabel={getUnitLabel()} />
          </CardContent>
        </Card>
        <div className="space-y-6">
            <Card className="rounded-xl shadow-md">
                <CardHeader>
                    <CardTitle className="text-xl">Usage Overview</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="relative w-48 h-48 mx-auto">
                        <UsageDonutChart value={usagePercentage} />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-4xl font-bold text-foreground">{usagePercentage}%</span>
                        </div>
                    </div>
                    <p className="mt-6 text-center text-muted-foreground">You have used {usagePercentage}% of your period's water allocation.</p>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
