
"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCompanies, getUsersByCompany } from "@/lib/data";
import type { Company, User } from "@/lib/data";
import { PlusCircle, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface CompanyWithAdmin extends Company {
  userCount: number;
  adminUser?: User;
}

export default function SuperAdminPage() {
  const { impersonateUser, currentUser } = useAuth();
  const [companies, setCompanies] = useState<CompanyWithAdmin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only super admins should see this page
    if (currentUser?.role !== 'Super Admin') {
        // Or redirect to their own dashboard
        return;
    }

    const fetchCompanies = async () => {
      setLoading(true);
      const companyList = await getCompanies();
      const companiesWithDetails = await Promise.all(
        companyList.map(async (company) => {
          const users = await getUsersByCompany(company.id);
          // Find any user with Admin privileges
          const adminUser = users.find(u => u.role.includes('Admin'));
          return { ...company, userCount: users.length, adminUser };
        })
      );
      setCompanies(companiesWithDetails);
      setLoading(false);
    };

    fetchCompanies();
  }, [currentUser]);

  const handleManageCompany = (adminUser?: User) => {
    if (adminUser) {
        impersonateUser(adminUser.id);
    } else {
        // Handle case where no admin is found, maybe with a toast notification
        console.error("No admin user found for this company.");
    }
  };


  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">
            Company Management
          </h2>
          <div className="flex items-center space-x-2">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Company
            </Button>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>All Companies</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Primary Admin</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      Loading companies...
                    </TableCell>
                  </TableRow>
                ) : (
                  companies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium">{company.name}</TableCell>
                      <TableCell>{company.userCount}</TableCell>
                      <TableCell>{company.adminUser ? `${company.adminUser.name} (${company.adminUser.email})` : 'N/A'}</TableCell>
                      <TableCell className="text-right">
                         <Button variant="outline" size="sm" onClick={() => handleManageCompany(company.adminUser)} disabled={!company.adminUser}>
                            <LogIn className="mr-2 h-4 w-4"/>
                            Manage
                         </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
