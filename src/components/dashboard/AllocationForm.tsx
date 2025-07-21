
import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Allocation, User } from "@/lib/data";
import { DateRangeSelector } from "./DateRangeSelector";
import type { DateRange } from "react-day-picker";
import { format, differenceInDays, addDays } from "date-fns";
import { AlertTriangle } from "lucide-react";

type Unit = "gallons" | "acre-feet" | "gpm" | "cfs" | "ac-ft/day";

const allocationFormSchema = z.object({
  dateRange: z.custom<DateRange>(val => val && (val as DateRange).from && (val as DateRange).to, {
      message: "Please select a start and end date."
  }),
  amount: z.coerce.number().positive({ message: "Amount must be positive." }),
  unit: z.enum(["gallons", "acre-feet", "gpm", "cfs", "ac-ft/day"]),
  userId: z.string().min(1, { message: "Please select who this applies to." }),
});

type AllocationFormValues = z.infer<typeof allocationFormSchema>;

interface AllocationFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (data: Omit<Allocation, "id" | "companyId">) => void;
  companyUsers: User[];
  existingAllocations: Allocation[];
}

// Conversion factors to gallons
const CONVERSIONS: Record<Unit, number> = {
    gallons: 1,
    'acre-feet': 325851,
    gpm: 1440, // gallons per minute to gallons per day
    cfs: 646317, // cubic feet per second to gallons per day
    'ac-ft/day': 325851,
};

function convertToGallons(amount: number, unit: Unit, days: number): number {
    if (unit === 'gallons' || unit === 'acre-feet') {
        // These are total amounts, not rates
        return amount * CONVERSIONS[unit];
    } else {
        // These are rates, so multiply by number of days in the period
        return amount * CONVERSIONS[unit] * days;
    }
}

const GAP_THRESHOLD_DAYS = 2; // More than 2 days is considered a gap.

export function AllocationForm({
  isOpen,
  onOpenChange,
  onSubmit,
  companyUsers,
  existingAllocations
}: AllocationFormProps) {
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null);
  const [gapWarning, setGapWarning] = useState<string | null>(null);

  const {
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<AllocationFormValues>({
    resolver: zodResolver(allocationFormSchema),
    defaultValues: {
      amount: 0,
      unit: "gallons",
      userId: "all",
      dateRange: undefined,
    },
  });

  const selectedDateRange = watch("dateRange");
  const selectedUserId = watch("userId");

  useEffect(() => {
    if (isOpen && selectedDateRange?.from && selectedDateRange?.to) {
      const newStart = selectedDateRange.from;
      const newEnd = selectedDateRange.to;

      // Filter allocations relevant to the current selection
      const relevantAllocations = existingAllocations.filter(alloc => 
        (selectedUserId === 'all' && !alloc.userId) || (alloc.userId === selectedUserId)
      );

      // Check for overlaps
      const overlappingAlloc = relevantAllocations.find(alloc => {
        const existingStart = new Date(alloc.startDate);
        const existingEnd = new Date(alloc.endDate);
        // We allow one day of overlap for continuous periods (e.g., end on 15th, start on 15th)
        return newStart < addDays(existingEnd, 1) && newEnd > addDays(existingStart, -1);
      });

      if (overlappingAlloc) {
        setOverlapWarning(`This period overlaps with an existing allocation from ${format(new Date(overlappingAlloc.startDate), 'P')} to ${format(new Date(overlappingAlloc.endDate), 'P')}.`);
      } else {
        setOverlapWarning(null);
      }
      
      // Check for gaps
      const allocationsBefore = relevantAllocations
        .filter(alloc => new Date(alloc.endDate) < newStart)
        .sort((a,b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
      
      if (allocationsBefore.length > 0) {
        const lastAllocation = allocationsBefore[0];
        const gap = differenceInDays(newStart, new Date(lastAllocation.endDate));
        if (gap > GAP_THRESHOLD_DAYS) {
          setGapWarning(`There is a gap of ${gap - 1} days since the last allocation, which ended on ${format(new Date(lastAllocation.endDate), 'P')}.`);
        } else {
            setGapWarning(null);
        }
      } else {
        setGapWarning(null);
      }

    } else {
      setOverlapWarning(null);
      setGapWarning(null);
    }

  }, [selectedDateRange, selectedUserId, existingAllocations, isOpen]);


  useEffect(() => {
    if (!isOpen) {
      reset();
      setOverlapWarning(null);
      setGapWarning(null);
    }
  }, [isOpen, reset]);
  
  const handleFormSubmit = (data: AllocationFormValues) => {
    const days = differenceInDays(data.dateRange.to!, data.dateRange.from!) + 1;
    const totalGallons = convertToGallons(data.amount, data.unit, days);

    onSubmit({
        startDate: format(data.dateRange.from!, 'yyyy-MM-dd'),
        endDate: format(data.dateRange.to!, 'yyyy-MM-dd'),
        gallons: totalGallons,
        userId: data.userId === 'all' ? undefined : data.userId
    });
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex h-full flex-col"
        >
          <SheetHeader>
            <SheetTitle>New Allocation</SheetTitle>
            <SheetDescription>
              Set a water usage budget for a specific period for all or one of your users.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-6 overflow-y-auto py-6 pr-6 pl-1">
            <div className="grid gap-2 pl-5">
                <Label htmlFor="dateRange">Allocation Period</Label>
                <Controller
                    name="dateRange"
                    control={control}
                    render={({ field }) => (
                        <DateRangeSelector
                            onUpdate={field.onChange}
                            selectedRange={field.value}
                        />
                    )}
                />
                 {errors.dateRange && (
                    <p className="text-sm text-destructive">{errors.dateRange.message}</p>
                )}
            </div>
            
            {(overlapWarning || gapWarning) && (
              <div className="space-y-4 pl-5">
                {overlapWarning && (
                  <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Overlapping Period</AlertTitle>
                      <AlertDescription>{overlapWarning}</AlertDescription>
                  </Alert>
                )}
                {gapWarning && (
                  <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Period Gap Detected</AlertTitle>
                      <AlertDescription>{gapWarning}</AlertDescription>
                  </Alert>
                )}
              </div>
            )}
            
            <div className="grid grid-cols-3 gap-4 pl-5">
                <div className="col-span-2 grid gap-2">
                    <Label htmlFor="amount">Amount</Label>
                     <Controller
                        name="amount"
                        control={control}
                        render={({ field }) => <Input id="amount" type="number" {...field} />}
                    />
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="unit">Unit</Label>
                    <Controller
                        name="unit"
                        control={control}
                        render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="gallons">Gallons</SelectItem>
                                <SelectItem value="acre-feet">Acre-Feet</SelectItem>
                                <SelectItem value="gpm">GPM</SelectItem>
                                <SelectItem value="cfs">CFS</SelectItem>
                                <SelectItem value="ac-ft/day">Ac-Ft/Day</SelectItem>
                            </SelectContent>
                        </Select>
                        )}
                    />
                </div>
            </div>
             {(errors.amount || errors.unit) && (
                <p className="text-sm text-destructive pl-5">{errors.amount?.message || errors.unit?.message}</p>
            )}

            <div className="grid gap-2 pl-5">
              <Label htmlFor="user">Applies To</Label>
              <Controller
                name="userId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      {companyUsers.map(user => (
                        <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.userId && (
                <p className="text-sm text-destructive">{errors.userId.message}</p>
              )}
            </div>
          </div>
          <SheetFooter className="mt-auto">
            <SheetClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </SheetClose>
            <Button type="submit">Create Allocation</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
