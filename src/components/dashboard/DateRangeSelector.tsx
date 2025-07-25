
"use client";

import * as React from "react";
import { format, parse, isValid, parseISO } from "date-fns";
import type { DateRange } from "react-day-picker";
import type { Allocation } from "@/lib/data";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");
  const [popoverOpen, setPopoverOpen] = React.useState(false);

  React.useEffect(() => {
    if (selectedRange?.from) {
        setStartDate(format(selectedRange.from, 'yyyy-MM-dd'));
    }
    if (selectedRange?.to) {
        setEndDate(format(selectedRange.to, 'yyyy-MM-dd'));
    }
  }, [selectedRange]);

  const handleApply = () => {
    const from = parse(startDate, 'yyyy-MM-dd', new Date());
    const to = parse(endDate, 'yyyy-MM-dd', new Date());

    if (isValid(from) && isValid(to) && from <= to) {
        onUpdate({ from, to });
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


  return (
    <div className={cn("flex items-end gap-2", className)}>
        <div className="grid gap-1">
            <Label htmlFor="start-date">Start Date</Label>
            <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
            />
        </div>
         <div className="grid gap-1">
            <Label htmlFor="end-date">End Date</Label>
            <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
            />
        </div>
        <Button onClick={handleApply}>Apply</Button>
         {allocations.length > 0 && (
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                     <Button
                        variant={"outline"}
                        className={cn("w-[150px] justify-start text-left font-normal")}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        <span>Presets</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                     <div className="p-2 space-y-2">
                        <p className="text-sm font-medium text-center text-muted-foreground">Allocation Periods</p>
                        <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                            {allocations.map(alloc => (
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
                </PopoverContent>
            </Popover>
         )}
    </div>
  );
}
