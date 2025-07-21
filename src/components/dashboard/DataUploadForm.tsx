
"use client";

import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileUp, AlertTriangle, Info } from "lucide-react";
import { findExistingUsageForUsersAndDates, User } from "@/lib/data";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface DataUploadFormProps {
    onUpload: (data: any[], mode: 'overwrite' | 'new_only') => void;
    companyUsers: User[];
}

interface CsvRecord {
    [key: string]: string;
}

type ConflictMode = 'overwrite' | 'new_only';

export function DataUploadForm({ onUpload, companyUsers }: DataUploadFormProps) {
    const [file, setFile] = useState<File | null>(null);
    const [records, setRecords] = useState<CsvRecord[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [duplicates, setDuplicates] = useState<string[]>([]);
    const [conflictMode, setConflictMode] = useState<ConflictMode>('overwrite');

    const userMap = useMemo(() => new Map(companyUsers.map(u => [u.email, u.id])), [companyUsers]);

    useEffect(() => {
        if (records.length > 0 && companyUsers.length > 0) {
            const checkDuplicates = async () => {
                const entriesToCheck = records.map(r => ({
                    userId: userMap.get(r.userEmail) || 'unknown',
                    date: r.date,
                })).filter(e => e.userId !== 'unknown');
                
                const foundDuplicates = await findExistingUsageForUsersAndDates(entriesToCheck);
                setDuplicates(foundDuplicates);
            };
            checkDuplicates();
        } else {
            setDuplicates([]);
        }
    }, [records, companyUsers, userMap]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        setRecords([]);
        setDuplicates([]);
        setError(null);

        if (selectedFile) {
            if (selectedFile.type !== "text/csv") {
                setError("Invalid file type. Please upload a CSV file.");
                setFile(null);
                return;
            }
            setFile(selectedFile);
            parseCsv(selectedFile);
        }
    };

    const parseCsv = (csvFile: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const lines = text.split(/\r\n|\n/);
            if (lines.length < 2) {
                setError("CSV file is empty or has no data rows.");
                return;
            }
            
            const headers = lines[0].split(',').map(h => h.trim());
            const requiredHeaders = ['userEmail', 'date', 'usage'];
            const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
            if (missingHeaders.length > 0) {
                setError(`Missing required columns: ${missingHeaders.join(', ')}`);
                return;
            }
            
            const data = lines.slice(1).filter(line => line.trim() !== '').map(line => {
                const values = line.split(',');
                return headers.reduce((obj, header, index) => {
                    obj[header] = values[index]?.trim();
                    return obj;
                }, {} as CsvRecord);
            });

            setRecords(data);
        };
        reader.onerror = () => {
            setError("Failed to read the file.");
        }
        reader.readAsText(csvFile);
    };

    const handleSubmit = () => {
        if (records.length > 0) {
            onUpload(records, conflictMode);
            setFile(null);
            setRecords([]);
            setDuplicates([]);
        } else {
            setError("No records to upload. Please select a valid CSV file.");
        }
    };
    
    const validRecords = records.filter(r => userMap.has(r.userEmail));
    const invalidRecords = records.filter(r => !userMap.has(r.userEmail));

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-4">
                <Input id="csv-upload" type="file" accept=".csv" onChange={handleFileChange} className="max-w-sm"/>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Upload Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {duplicates.length > 0 && (
                 <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Duplicate Records Found</AlertTitle>
                    <AlertDescription>
                       Found {duplicates.length} records for users and dates that already have usage data. Please choose how to handle them.
                    </AlertDescription>
                    <RadioGroup value={conflictMode} onValueChange={(value: ConflictMode) => setConflictMode(value)} className="mt-4 space-y-2">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="overwrite" id="overwrite" />
                            <Label htmlFor="overwrite">Replace existing data with values from the file</Label>
                        </div>
                         <div className="flex items-center space-x-2">
                            <RadioGroupItem value="new_only" id="new_only" />
                            <Label htmlFor="new_only">Keep existing data and only add new records</Label>
                        </div>
                    </RadioGroup>
                </Alert>
            )}

            {records.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Preview Data</h3>
                    <div className="rounded-md border max-h-72 overflow-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-background">
                                <TableRow>
                                    {Object.keys(records[0]).map(header => (
                                        <TableHead key={header}>{header}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {records.slice(0, 20).map((record, index) => (
                                    <TableRow key={index} className={!userMap.has(record.userEmail) ? "bg-destructive/10" : ""}>
                                        {Object.values(record).map((value, i) => (
                                            <TableCell key={i}>{value}</TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                     <p className="text-sm text-muted-foreground">
                        Showing first {Math.min(20, records.length)} of {records.length} records.
                        Found {validRecords.length} valid records for known users.
                        {invalidRecords.length > 0 && ` Skipped ${invalidRecords.length} records for unknown users (highlighted in red).`}
                    </p>
                    <Button onClick={handleSubmit} disabled={validRecords.length === 0}>
                        <FileUp className="mr-2 h-4 w-4" />
                        Process {validRecords.length} Records
                    </Button>
                </div>
            )}
        </div>
    );
}
