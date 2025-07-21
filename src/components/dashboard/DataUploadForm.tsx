
"use client";

import { useState } from "react";
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
import { FileUp, AlertTriangle } from "lucide-react";

interface DataUploadFormProps {
    onUpload: (data: any[]) => void;
}

interface CsvRecord {
    [key: string]: string;
}

export function DataUploadForm({ onUpload }: DataUploadFormProps) {
    const [file, setFile] = useState<File | null>(null);
    const [records, setRecords] = useState<CsvRecord[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            if (selectedFile.type !== "text/csv") {
                setError("Invalid file type. Please upload a CSV file.");
                setFile(null);
                setRecords([]);
                return;
            }
            setFile(selectedFile);
            setError(null);
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
                setRecords([]);
                return;
            }
            
            const headers = lines[0].split(',').map(h => h.trim());
            // Basic validation for required headers
            const requiredHeaders = ['userEmail', 'date', 'usage'];
            const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
            if (missingHeaders.length > 0) {
                setError(`Missing required columns: ${missingHeaders.join(', ')}`);
                setRecords([]);
                return;
            }
            
            const data = lines.slice(1).filter(line => line.trim() !== '').map(line => {
                const values = line.split(',');
                return headers.reduce((obj, header, index) => {
                    obj[header] = values[index];
                    return obj;
                }, {} as CsvRecord);
            });

            setRecords(data);
        };
        reader.onerror = () => {
            setError("Failed to read the file.");
            setRecords([]);
        }
        reader.readAsText(csvFile);
    };

    const handleSubmit = () => {
        if (records.length > 0) {
            onUpload(records);
        } else {
            setError("No records to upload. Please select a valid CSV file.");
        }
    };

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
                                {records.slice(0, 20).map((record, index) => ( // Preview first 20 records
                                    <TableRow key={index}>
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
                    </p>
                    <Button onClick={handleSubmit} disabled={records.length === 0}>
                        <FileUp className="mr-2 h-4 w-4" />
                        Process {records.length} Records
                    </Button>
                </div>
            )}
        </div>
    );
}

