
"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
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

interface DateRangeSelectorProps {
  onUpdate: (range: DateRange) => void;
  className?: string;
  selectedRange?: DateRange;
  allocations?: Allocation[];
}

export function DateRangeSelector({ onUpdate, className, selectedRange, allocations = [] }: DateRangeSelectorProps) {
  const [date, setDate] = React.useState<DateRange | undefined>(selectedRange);
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  
  React.useEffect(() => {
    // Sync with external state changes, e.g., from parent
    setDate(selectedRange);
  }, [selectedRange]);

  const handleDateChange = (newDate: DateRange | undefined) => {
    if (newDate) {
      setDate(newDate);
      if (newDate.from && newDate.to) {
        onUpdate(newDate);
        setPopoverOpen(false); // Close popover when range is selected
      }
    }
  }

  const handleAllocationSelect = (allocation: Allocation) => {
    const newRange = {
      from: parseISO(allocation.startDate),
      to: parseISO(allocation.endDate)
    };
    onUpdate(newRange);
    setDate(newRange);
    setPopoverOpen(false);
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          {allocations.length > 0 && (
            <div className="p-2 space-y-2">
                <p className="text-sm font-medium text-center text-muted-foreground">Select a Period</p>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
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
                <Separator/>
            </div>
          )}
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleDateChange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
