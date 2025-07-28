
"use client";

import * as React from "react";
import { format, parseISO, isValid } from "date-fns";
import type { DateRange } from "react-day-picker";
import type { Allocation } from "@/lib/data";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Calendar as CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


interface DateRangeSelectorProps {
  onUpdate: (range: DateRange) => void;
  className?: string;
  selectedRange?: DateRange;
  allocations?: Allocation[];
}

export function DateRangeSelector({ onUpdate, className, selectedRange, allocations = [] }: DateRangeSelectorProps) {
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");

  React.useEffect(() => {
    if (selectedRange?.from) {
      setStartDate(format(selectedRange.from, 'yyyy-MM-dd'));
    }
    if (selectedRange?.to) {
      setEndDate(format(selectedRange.to, 'yyyy-MM-dd'));
    }
  }, [selectedRange]);

  const handleUpdateClick = () => {
    const fromDate = new Date(startDate);
    const toDate = new Date(endDate);
    
    // The dates from the input are UTC midnight. To include the full end day, we adjust it.
    // e.g. '2025-07-26' becomes '2025-07-26T00:00:00.000Z'. 
    // We want the range to include this entire day.
    const toDateInclusive = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate(), 23, 59, 59);

    if (isValid(fromDate) && isValid(toDateInclusive) && fromDate <= toDateInclusive) {
        onUpdate({ from: fromDate, to: toDateInclusive });
        setPopoverOpen(false);
    } else {
        // Optional: handle invalid date range, e.g., show a toast
        console.warn("Invalid date range selected.");
    }
  }
  
  const handleAllocationSelect = (allocation: Allocation) => {
    const newRange = {
      from: parseISO(allocation.startDate),
      to: parseISO(allocation.endDate)
    };
    onUpdate(newRange);
    setPopoverOpen(false);
  }

  const sortedAllocations = React.useMemo(() => {
    return [...allocations].sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [allocations]);


  return (
    <div className={cn("grid gap-2", className)}>
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
                <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                        "w-[300px] justify-start text-left font-normal",
                        !selectedRange && "text-muted-foreground"
                    )}
                    >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedRange?.from ? (
                        selectedRange.to ? (
                        <>
                            {format(selectedRange.from, "LLL dd, y")} -{" "}
                            {format(selectedRange.to, "LLL dd, y")}
                        </>
                        ) : (
                        format(selectedRange.from, "LLL dd, y")
                        )
                    ) : (
                        <span>Pick a date</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
                <div className="flex">
                    <div className="p-4 space-y-4">
                        <p className="text-sm font-medium text-muted-foreground">Custom Range</p>
                        <div className="grid gap-2">
                            <Label htmlFor="start-date">Start Date</Label>
                            <Input id="start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </div>
                         <div className="grid gap-2">
                            <Label htmlFor="end-date">End Date</Label>
                            <Input id="end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                        <Button onClick={handleUpdateClick} className="w-full">Update</Button>
                    </div>

                    {sortedAllocations.length > 0 && (
                        <>
                            <Separator orientation="vertical" className="h-auto mx-0" />
                            <div className="p-4 space-y-4">
                                <p className="text-sm font-medium text-muted-foreground">Allocation Periods</p>
                                <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2">
                                    {sortedAllocations.map(alloc => (
                                        <Button
                                            key={alloc.id}
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleAllocationSelect(alloc)}
                                        >
                                            {format(parseISO(alloc.startDate), 'MMM d')} - {format(parseISO(alloc.endDate), 'MMM d, yyyy')}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    </div>
  );
}

