
'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Droplets, LineChart, Scale, CalendarDays, Users } from 'lucide-react';
import DailyUsageChart from './daily-usage-chart';
import UsageDonutChart from './usage-donut-chart';
import { getAllocationForDate, getDailyUsageForDateRange, DailyUsage, User, getUsers, getInvites } from '@/firestoreService';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


const DEFAULT_TOTAL_ALLOCATION = 5000000;

export default function CustomerDashboard() {
  const { userDetails, loading: authLoading } = useAuth();
  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfMonth(new Date(2025, 6, 6)),
    to: endOfMonth(new Date(2025, 6, 6)),
  });
  
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [loading, setLoading] = useState(true);
  const [totalPeriodAllocation, setTotalPeriodAllocation] = useState(0);
  const [waterUsed, setWaterUsed] = useState(0);
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const initializeUser = async () => {
        if (userDetails) {
            try {
                const fetchedUsers = await getUsers();
                setAllUsers(fetchedUsers);
                if (userDetails.role === 'admin') {
                    const customerUsers = fetchedUsers.filter(u => u.role !== 'admin');
                    setUsers(customerUsers);
                    if (customerUsers.length > 0) {
                        setSelectedUser(customerUsers[0]);
                    }
                } else {
                    setSelectedUser(userDetails);
                }
            } catch (error) {
                toast({
                    variant: 'destructive',
                    title: 'Failed to fetch users',
                    description: 'Could not load user list.',
                });
            }
        }
    };
    initializeUser();
  }, [userDetails, toast]);


  useEffect(() => {
    const fetchPeriodData = async () => {
        if (!date?.from || !date?.to || !selectedUser) {
          setLoading(false);
          setDailyUsage([]);
          setWaterUsed(0);
          setTotalPeriodAllocation(0);
          return;
        };

        setLoading(true);

        try {
            const allocationForPeriod = await getAllocationForDate(date.from);
            const totalSystemShares = allUsers.reduce((acc, user) => acc + user.shares, 0);

            const userAllocation = (allocationForPeriod ?? DEFAULT_TOTAL_ALLOCATION) * (selectedUser.shares / totalSystemShares);
            setTotalPeriodAllocation(userAllocation);

            const dailyData = await getDailyUsageForDateRange(selectedUser.id, date.from, date.to);
            setDailyUsage(dailyData);
            
            const totalUsed = dailyData.reduce((acc, day) => acc + day.gallons, 0);
            setWaterUsed(totalUsed);

        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Data Fetch Failed',
                description: 'Could not fetch your usage data for this period.',
            });
            const totalSystemShares = allUsers.reduce((acc, user) => acc + user.shares, 0);
            setTotalPeriodAllocation(DEFAULT_TOTAL_ALLOCATION * ((selectedUser?.shares || 0) / totalSystemShares));
            setWaterUsed(0);
            setDailyUsage([]);
        } finally {
            setLoading(false);
        }
    };
    
    if (selectedUser) {
      fetchPeriodData();
    } else if (userDetails?.role === 'admin' && users.length === 0){
        // Admin view, but no customers yet
        setLoading(false);
    }
  }, [date, toast, selectedUser, userDetails, users, allUsers]);
  
  const handleUserChange = (userId: string) => {
      const user = users.find(u => u.id === userId);
      if (user) {
          setSelectedUser(user);
      }
  };

  const remaining = totalPeriodAllocation - waterUsed;
  const usagePercentage = totalPeriodAllocation > 0 ? Math.round((waterUsed / totalPeriodAllocation) * 100) : 0;
  
  const welcomeMessage = userDetails?.role === 'admin' 
    ? selectedUser ? `Viewing as: ${selectedUser.name}` : 'Customer View'
    : `Welcome, ${userDetails?.name || 'User'}`;
  const subMessage = userDetails?.role === 'admin' 
    ? selectedUser ? 'Select a user to view their summary.' : 'There are no customers to display.'
    : "Here's your water usage summary.";


  if (authLoading) {
      return (
          <div className="flex flex-col items-center justify-center h-screen p-8">
              <Skeleton className="w-full max-w-4xl h-96" />
          </div>
      );
  }

  if (!userDetails) {
       return (
          <div className="flex flex-col items-center justify-center h-screen">
              <h1 className="text-2xl font-bold text-foreground">User not found</h1>
              <p className="text-muted-foreground">Please contact support.</p>
          </div>
      );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col sm:flex-row justify-between sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{welcomeMessage}</h1>
          <p className="text-muted-foreground">{subMessage}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {userDetails.role === 'admin' && users.length > 0 && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <Users className="h-5 w-5 text-muted-foreground" />
                <Select onValueChange={handleUserChange} value={selectedUser?.id}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                    <SelectContent>
                        {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          )}
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
                          {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
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
        
      {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="rounded-xl shadow-md"><CardContent className="p-6"><Skeleton className="h-[88px] w-full" /></CardContent></Card>
              <Card className="rounded-xl shadow-md"><CardContent className="p-6"><Skeleton className="h-[88px] w-full" /></CardContent></Card>
              <Card className="rounded-xl shadow-md"><CardContent className="p-6"><Skeleton className="h-[88px] w-full" /></CardContent></Card>
          </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="rounded-xl shadow-md">
            <CardContent className="p-6 flex items-center space-x-4">
                <div className="bg-blue-100 p-4 rounded-full">
                <Droplets className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                <p className="text-sm text-muted-foreground">Period Allocation</p>
                <p className="text-3xl font-bold text-foreground">{totalPeriodAllocation.toLocaleString()} <span className="text-lg font-normal text-muted-foreground">gal</span></p>
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
                <p className="text-3xl font-bold text-foreground">{waterUsed.toLocaleString()} <span className="text-lg font-normal text-muted-foreground">gal</span></p>
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
                <p className="text-3xl font-bold text-foreground">{remaining.toLocaleString()} <span className="text-lg font-normal text-muted-foreground">gal</span></p>
                </div>
            </CardContent>
            </Card>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 rounded-xl shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">Daily Usage (Gallons)</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            {loading ? <div className="w-full h-full flex items-center justify-center"><Skeleton className="w-full h-full" /></div> : <DailyUsageChart data={dailyUsage} />}
          </CardContent>
        </Card>
        <div className="space-y-6">
            <Card className="rounded-xl shadow-md">
                <CardHeader>
                    <CardTitle className="text-xl">Usage Overview</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex flex-col items-center">
                            <Skeleton className="w-48 h-48 rounded-full" />
                            <Skeleton className="h-5 w-3/4 mt-6" />
                        </div>
                    ): (
                        <>
                        <div className="relative w-48 h-48 mx-auto">
                            <UsageDonutChart value={usagePercentage} />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-4xl font-bold text-foreground">{usagePercentage}%</span>
                            </div>
                        </div>
                        <p className="mt-6 text-center text-muted-foreground">You have used {usagePercentage}% of your period's water allocation.</p>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}

    