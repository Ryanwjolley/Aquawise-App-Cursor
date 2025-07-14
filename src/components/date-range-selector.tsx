
'use client';
import { useState, useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CalendarDays } from 'lucide-react';
import type { Allocation } from '@/firestoreService';
import { cn } from '@/lib/utils';

type DateRangeSelectorProps = {
    date: DateRange | undefined;
    setDate: (date: DateRange | undefined) => void;
    allocations: Allocation[];
    className?: string;
};

export function DateRangeSelector({ date, setDate, allocations, className }: DateRangeSelectorProps) {
    const [selectionMode, setSelectionMode] = useState<'allocation' | 'custom'>('allocation');
    const [selectedAllocationId, setSelectedAllocationId] = useState<string>('');

    const handleAllocationSelect = (allocationId: string) => {
        const selected = allocations.find(a => a.id === allocationId);
        if (selected) {
            setDate({ from: selected.startDate, to: selected.endDate });
            setSelectedAllocationId(allocationId);
        }
    };
    
    const allocationOptions = useMemo(() => {
        return allocations.map(alloc => ({
            id: alloc.id,
            label: `${format(alloc.startDate, 'LLL d, yyyy')} - ${format(alloc.endDate, 'LLL d, yyyy')}`
        }));
    }, [allocations]);

    // Set a default if allocations exist and none is selected
    if (selectionMode === 'allocation' && !selectedAllocationId && allocationOptions.length > 0) {
        const firstAllocation = allocations[0];
        setDate({ from: firstAllocation.startDate, to: firstAllocation.endDate });
        setSelectedAllocationId(firstAllocation.id);
    }
    
    return (
        <div className={cn("flex flex-col gap-2", className)}>
            <div className="flex flex-col gap-1">
                <Label>View Period</Label>
                <RadioGroup
                    value={selectionMode}
                    onValueChange={(value) => setSelectionMode(value as 'allocation' | 'custom')}
                    className="flex items-center"
                >
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="allocation" id="r1" />
                        <Label htmlFor="r1">By Allocation</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="custom" id="r2" />
                        <Label htmlFor="r2">By Custom Range</Label>
                    </div>
                </RadioGroup>
            </div>

            {selectionMode === 'allocation' ? (
                 <Select onValueChange={handleAllocationSelect} value={selectedAllocationId}>
                    <SelectTrigger className="w-full sm:w-[280px]">
                        <SelectValue placeholder="Select an allocation period" />
                    </SelectTrigger>
                    <SelectContent>
                        {allocationOptions.map(option => (
                            <SelectItem key={option.id} value={option.id}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            ) : (
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                                "w-full sm:w-[280px] justify-start text-left font-normal",
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
                            onSelect={(range) => {
                                setDate(range);
                                setSelectedAllocationId('');
                            }}
                            numberOfMonths={2}
                        />
                    </PopoverContent>
                </Popover>
            )}
        </div>
    );
}
