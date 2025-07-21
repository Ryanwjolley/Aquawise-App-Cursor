
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
import type { Company } from "@/lib/data";
import { PlusCircle, MoreHorizontal } from "lucide-react";

interface CompanyWithUserCount extends Company {
  userCount: number;
}

export default function SuperAdminPage() {
  const [companies, setCompanies] = useState<CompanyWithUserCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompanies = async () => {
      setLoading(true);
      const companyList = await getCompanies();
      const companiesWithCounts = await Promise.all(
        companyList.map(async (company) => {
          const users = await getUsersByCompany(company.id);
          return { ...company, userCount: users.length };
        })
      );
      setCompanies(companiesWithCounts);
      setLoading(false);
    };

    fetchCompanies();
  }, []);

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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center">
                      Loading companies...
                    </TableCell>
                  </TableRow>
                ) : (
                  companies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium">{company.name}</TableCell>
                      <TableCell>{company.userCount}</TableCell>
                      <TableCell className="text-right">
                         <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
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
