
"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import type { DateRange } from "react-day-picker";
import type { Allocation } from "@/lib/data";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Calendar as CalendarIcon } from "lucide-react";


interface DateRangeSelectorProps {
  onUpdate: (range: DateRange) => void;
  className?: string;
  selectedRange?: DateRange;
  allocations?: Allocation[];
}

export function DateRangeSelector({ onUpdate, className, selectedRange, allocations = [] }: DateRangeSelectorProps) {
  const [popoverOpen, setPopoverOpen] = React.useState(false);

  const handleDateSelect = (range: DateRange | undefined) => {
    if (range?.from && range.to) {
        onUpdate(range);
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
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={selectedRange?.from}
                        selected={selectedRange}
                        onSelect={handleDateSelect}
                        numberOfMonths={2}
                    />
                    {sortedAllocations.length > 0 && (
                        <>
                            <Separator orientation="vertical" className="h-auto mx-0" />
                            <div className="p-2 space-y-2">
                                <p className="text-sm font-medium text-center text-muted-foreground">Allocation Periods</p>
                                <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto pr-1">
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

