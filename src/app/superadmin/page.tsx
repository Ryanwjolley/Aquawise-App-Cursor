
'use client';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import AppLayout from '@/components/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle, Building, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCompanies, addCompany, Company } from '@/firestoreService';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


export default function SuperAdminPage() {
  const { user, userDetails, loading: authLoading, startImpersonation, refreshCompanies } = useAuth();
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCompanyFormOpen, setIsCompanyFormOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminMobile, setAdminMobile] = useState('');

  const { toast } = useToast();

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedCompanies = await getCompanies();
      setCompanies(fetchedCompanies);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Failed to fetch companies' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!authLoading) {
      // Simple auth guard
      if (!user || !userDetails || userDetails.companyId !== 'system-admin') {
        router.replace('/dashboard');
      } else {
        fetchCompanies();
      }
    }
  }, [user, userDetails, authLoading, router, fetchCompanies]);
  
  const resetForm = () => {
      setNewCompanyName('');
      setAdminName('');
      setAdminEmail('');
      setAdminMobile('');
  }

  const handleAddCompany = async () => {
    if (!newCompanyName.trim() || !adminName.trim() || !adminEmail.trim()) {
      toast({ variant: 'destructive', title: 'All Fields Required', description: 'Please fill out all fields to create a company.' });
      return;
    }
    try {
      await addCompany({
        companyName: newCompanyName,
        adminName,
        adminEmail,
      });
      await fetchCompanies(); // Re-fetch to show the new company
      await refreshCompanies(); // Re-fetch in auth context as well
      resetForm();
      setIsCompanyFormOpen(false);
      toast({ title: 'Company Created', description: `Successfully created ${newCompanyName} and its admin.` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Failed to Create Company', description: (error as Error).message || 'An unknown error occurred.' });
    }
  };
  
  const handleViewSystem = (companyId: string) => {
    startImpersonation(companyId);
    router.push('/admin');
  };

  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="p-4 sm:p-6 lg:p-8">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Super Admin Portal</h1>
                    <p className="text-muted-foreground">Manage all companies on the platform.</p>
                </div>
                <Skeleton className="h-10 w-40" />
            </header>
            <Card className="rounded-xl shadow-md">
                <CardHeader>
                    <CardTitle><Skeleton className="h-6 w-1/3" /></CardTitle>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-40 w-full" />
                </CardContent>
            </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <header className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Super Admin Portal</h1>
                <p className="text-muted-foreground">Manage all companies on the platform.</p>
            </div>
            <Dialog open={isCompanyFormOpen} onOpenChange={setIsCompanyFormOpen}>
                <DialogTrigger asChild>
                    <Button><PlusCircle className="mr-2 h-4 w-4" />New Company</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Company</DialogTitle>
                        <DialogDescription>Create a new company and its initial administrator account.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor='company-name'>Company Name</Label>
                            <Input id="company-name" placeholder="e.g. Sterling Irrigation Inc." value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor='admin-name'>Admin Full Name</Label>
                            <Input id="admin-name" placeholder="e.g. John Watermaster" value={adminName} onChange={(e) => setAdminName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor='admin-email'>Admin Email</Label>
                            <Input id="admin-email" type="email" placeholder="e.g. admin@sterling.com" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor='admin-mobile'>Admin Mobile (Optional)</Label>
                            <Input id="admin-mobile" type="tel" placeholder="e.g. (555) 123-4567" value={adminMobile} onChange={(e) => setAdminMobile(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline" onClick={resetForm}>Cancel</Button></DialogClose>
                        <Button onClick={handleAddCompany}>Create Company & Admin</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </header>

        <Card className="rounded-xl shadow-md">
          <CardHeader>
            <CardTitle>All Companies ({companies.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Company ID</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium flex items-center gap-3">
                        <Building className="h-4 w-4 text-muted-foreground"/>
                        {company.name}
                    </TableCell>
                    <TableCell>
                        <code className="text-xs p-1 bg-muted rounded-sm">{company.id}</code>
                    </TableCell>
                    <TableCell className="text-right">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => handleViewSystem(company.id)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View System</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {companies.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    <p>No companies have been created yet.</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
