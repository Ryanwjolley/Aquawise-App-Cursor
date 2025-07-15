
'use client';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button, buttonVariants } from '@/components/ui/button';
import { PlusCircle, Building, Eye, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCompanies, addCompany, Company, updateCompany, User, getAdminForCompany, updateUser, deleteCompany } from '@/firestoreService';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


export default function SuperAdminPage() {
  const { user, userDetails, loading: authLoading, startImpersonation, refreshCompanies } = useAuth();
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddCompanyFormOpen, setIsAddCompanyFormOpen] = useState(false);
  const [isEditCompanyFormOpen, setIsEditCompanyFormOpen] = useState(false);
  
  // State for adding a company
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminMobile, setNewAdminMobile] = useState('');

  // State for editing a company
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editingAdmin, setEditingAdmin] = useState<User | null>(null);
  const [editedCompanyName, setEditedCompanyName] = useState('');
  const [editedAdminName, setEditedAdminName] = useState('');
  const [editedAdminMobile, setEditedAdminMobile] = useState('');
  
  // State for deleting a company
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);


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
    if (refreshCompanies) {
        refreshCompanies().then(() => fetchCompanies());
    }
  }, [fetchCompanies, refreshCompanies]);
  
  const resetAddForm = () => {
      setNewCompanyName('');
      setNewAdminName('');
      setNewAdminEmail('');
      setNewAdminMobile('');
  }

  const handleAddCompany = async () => {
    if (!newCompanyName.trim() || !newAdminName.trim() || !newAdminEmail.trim()) {
      toast({ variant: 'destructive', title: 'All Fields Required', description: 'Please fill out all fields to create a company.' });
      return;
    }
    try {
      await addCompany({
        companyName: newCompanyName,
        adminName: newAdminName,
        adminEmail: newAdminEmail,
      });
      await fetchCompanies(); // Re-fetch to show the new company
      await refreshCompanies(); // Re-fetch in auth context as well
      resetAddForm();
      setIsAddCompanyFormOpen(false);
      toast({ title: 'Company Created', description: `Successfully created ${newCompanyName} and its admin.` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Failed to Create Company', description: (error as Error).message || 'An unknown error occurred.' });
    }
  };

  const handleEditCompany = async (company: Company) => {
    setEditingCompany(company);
    setEditedCompanyName(company.name);

    try {
        const adminUser = await getAdminForCompany(company.id);
        if (adminUser) {
            setEditingAdmin(adminUser);
            setEditedAdminName(adminUser.name);
            setEditedAdminMobile((adminUser as any).mobile || ''); // Assuming mobile might not exist
        } else {
            toast({ variant: 'destructive', title: 'Admin Not Found', description: 'Could not find an administrator for this company.' });
            setEditingAdmin(null);
        }
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch admin details.' });
    }

    setIsEditCompanyFormOpen(true);
  };

  const handleUpdateCompany = async () => {
    if (!editingCompany || !editedCompanyName.trim() || !editingAdmin || !editedAdminName.trim()) {
        toast({ variant: 'destructive', title: 'Invalid Input', description: 'Company and Admin names cannot be empty.' });
        return;
    }
    try {
        const companyUpdateData = { name: editedCompanyName };
        const adminUpdateData: Partial<User> = { 
            name: editedAdminName,
        };
        if(editedAdminMobile) {
            (adminUpdateData as any).mobile = editedAdminMobile;
        }

        await updateCompany(editingCompany.id, companyUpdateData);
        await updateUser(editingAdmin.id, adminUpdateData);

        await fetchCompanies();
        await refreshCompanies();
        
        setIsEditCompanyFormOpen(false);
        setEditingCompany(null);
        setEditingAdmin(null);

        toast({ title: 'Company Updated', description: 'The company and admin details have been successfully updated.' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update the company details.' });
    }
  };
  
  const handleViewSystem = (companyId: string) => {
    startImpersonation(companyId);
    router.push('/admin');
  };
  
  const handleConfirmDeleteCompany = async () => {
    if (!companyToDelete) return;

    try {
        await deleteCompany(companyToDelete.id);
        toast({ title: 'Company Deleted', description: `${companyToDelete.name} and all its data have been removed.` });
        fetchCompanies();
        refreshCompanies();
    } catch (error) {
        toast({ variant: 'destructive', title: 'Deletion Failed', description: 'Could not delete the company.' });
    } finally {
        setCompanyToDelete(null);
    }
  };

  if (authLoading || loading) {
    return (
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
    );
  }

  return (
      <div className="p-4 sm:p-6 lg:p-8">
        <header className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Super Admin Portal</h1>
                <p className="text-muted-foreground">Manage all companies on the platform.</p>
            </div>
            {/* Add Company Dialog */}
            <Dialog open={isAddCompanyFormOpen} onOpenChange={setIsAddCompanyFormOpen}>
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
                            <Input id="admin-name" placeholder="e.g. John Watermaster" value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor='admin-email'>Admin Email</Label>
                            <Input id="admin-email" type="email" placeholder="e.g. admin@sterling.com" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor='admin-mobile'>Admin Mobile (Optional)</Label>
                            <Input id="admin-mobile" type="tel" placeholder="e.g. (555) 123-4567" value={newAdminMobile} onChange={(e) => setNewAdminMobile(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline" onClick={resetAddForm}>Cancel</Button></DialogClose>
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
                                <Button variant="ghost" size="icon" onClick={() => handleEditCompany(company)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Edit Company & Admin</p></TooltipContent>
                        </Tooltip>
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
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setCompanyToDelete(company)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Delete Company</p>
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
      
      {/* Edit Company Dialog */}
      <Dialog open={isEditCompanyFormOpen} onOpenChange={setIsEditCompanyFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Company & Admin</DialogTitle>
            <DialogDescription>Update the details for this company and its administrator.</DialogDescription>
          </DialogHeader>
          {editingCompany && editingAdmin && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-company-name">Company Name</Label>
                <Input
                  id="edit-company-name"
                  value={editedCompanyName}
                  onChange={(e) => setEditedCompanyName(e.target.value)}
                />
              </div>
               <div className="space-y-2">
                <Label htmlFor="edit-admin-name">Admin Name</Label>
                <Input
                  id="edit-admin-name"
                  value={editedAdminName}
                  onChange={(e) => setEditedAdminName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-admin-email">Admin Email</Label>
                <Input
                  id="edit-admin-email"
                  value={editingAdmin?.email || ''}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-admin-mobile">Admin Mobile (Optional)</Label>
                <Input
                  id="edit-admin-mobile"
                  type="tel"
                  value={editedAdminMobile}
                  onChange={(e) => setEditedAdminMobile(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleUpdateCompany}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Company Confirmation Dialog */}
       <AlertDialog open={!!companyToDelete} onOpenChange={(isOpen) => !isOpen && setCompanyToDelete(null)}>
          <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the company <span className="font-bold">{companyToDelete?.name}</span> and all of its associated users and data.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConfirmDeleteCompany} className={buttonVariants({ variant: "destructive" })}>Delete Company</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
      </div>
  );
}
