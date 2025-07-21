
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
import { format, differenceInMinutes, addMinutes, subMinutes, parseISO } from "date-fns";
import { AlertTriangle } from "lucide-react";

type Unit = "gallons" | "acre-feet" | "gpm" | "cfs" | "ac-ft/day";

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const allocationFormSchema = z.object({
  startDate: z.string().regex(dateRegex, "Invalid date format. Use YYYY-MM-DD."),
  endDate: z.string().regex(dateRegex, "Invalid date format. Use YYYY-MM-DD."),
  startTime: z.string().regex(timeRegex, "Invalid time format. Use HH:MM."),
  endTime: z.string().regex(timeRegex, "Invalid time format. Use HH:MM."),
  amount: z.coerce.number().positive({ message: "Amount must be positive." }),
  unit: z.enum(["gallons", "acre-feet", "gpm", "cfs", "ac-ft/day"]),
  userId: z.string().min(1, { message: "Please select who this applies to." }),
}).refine(data => {
    const start = combineDateTime(data.startDate, data.startTime);
    const end = combineDateTime(data.endDate, data.endTime);
    return start && end && start < end;
}, {
    message: "End date and time must be after start date and time.",
    path: ["endDate"],
});


type AllocationFormValues = z.infer<typeof allocationFormSchema>;

interface AllocationFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (data: Omit<Allocation, "id" | "companyId">) => void;
  companyUsers: User[];
  existingAllocations: Allocation[];
  defaultValues?: Allocation;
}

// Conversion factors to gallons per minute
const CONVERSIONS_GPM: Record<Exclude<Unit, 'gallons' | 'acre-feet' | 'ac-ft/day'>, number> = {
    gpm: 1, 
    cfs: 448.831, // cubic feet per second to gallons per minute
};

function convertToGallons(amount: number, unit: Unit, minutes: number): number {
    if (unit === 'gallons') return amount;
    if (unit === 'acre-feet') return amount * 325851;
    if (unit === 'ac-ft/day') return (amount * 325851) / 1440 * minutes;

    // It's a rate unit
    return amount * CONVERSIONS_GPM[unit as keyof typeof CONVERSIONS_GPM] * minutes;
}

const GAP_THRESHOLD_MINUTES = 1;

const combineDateTime = (dateStr: string, timeStr: string): Date | null => {
    if (!dateStr || !timeStr || !dateStr.match(dateRegex) || !timeStr.match(timeRegex)) return null;
    return parseISO(`${dateStr}T${timeStr}:00`);
};

export function AllocationForm({
  isOpen,
  onOpenChange,
  onSubmit,
  companyUsers,
  existingAllocations,
  defaultValues
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
      startDate: format(new Date(), "yyyy-MM-dd"),
      endDate: format(new Date(), "yyyy-MM-dd"),
      startTime: "00:00",
      endTime: "23:59",
    },
  });

  const watchedValues = watch();

  useEffect(() => {
    if (isOpen) {
      if (defaultValues) {
        // This is a rough conversion back for editing. Might not be perfect for rate-based units.
        // A more complex solution would be needed for perfect bi-directional conversion.
        // For now, we assume editing will be primarily on total 'gallons'.
        const start = new Date(defaultValues.startDate);
        const end = new Date(defaultValues.endDate);
        reset({
          amount: defaultValues.gallons,
          unit: "gallons", // Default to gallons for editing to avoid conversion complexity
          userId: defaultValues.userId || "all",
          startDate: format(start, "yyyy-MM-dd"),
          startTime: format(start, "HH:mm"),
          endDate: format(end, "yyyy-MM-dd"),
          endTime: format(end, "HH:mm"),
        });
      } else {
         reset({
          amount: 0,
          unit: "gallons",
          userId: "all",
          startDate: format(new Date(), "yyyy-MM-dd"),
          endDate: format(new Date(), "yyyy-MM-dd"),
          startTime: "00:00",
          endTime: "23:59",
        });
      }
    }
  }, [isOpen, defaultValues, reset]);
  
  useEffect(() => {
    if (isOpen && watchedValues.startDate && watchedValues.endDate && watchedValues.startTime && watchedValues.endTime) {
      const newStart = combineDateTime(watchedValues.startDate, watchedValues.startTime);
      const newEnd = combineDateTime(watchedValues.endDate, watchedValues.endTime);

      if (!newStart || !newEnd || newStart >= newEnd) {
         setOverlapWarning(null);
         setGapWarning(null);
         return;
      }
      
      const relevantAllocations = existingAllocations.filter(alloc => 
        ((watchedValues.userId === 'all' && !alloc.userId) || (alloc.userId === watchedValues.userId)) &&
        alloc.id !== defaultValues?.id // Exclude the one being edited
      );

      // Check for overlaps
      const overlappingAlloc = relevantAllocations.find(alloc => {
        const existingStart = new Date(alloc.startDate);
        const existingEnd = new Date(alloc.endDate);
        return newStart < addMinutes(existingEnd, GAP_THRESHOLD_MINUTES) && newEnd > subMinutes(existingStart, GAP_THRESHOLD_MINUTES);
      });

      if (overlappingAlloc) {
        setOverlapWarning(`This period is too close to an existing allocation from ${format(new Date(overlappingAlloc.startDate), 'P p')} to ${format(new Date(overlappingAlloc.endDate), 'P p')}.`);
      } else {
        setOverlapWarning(null);
      }
      
      // Check for gaps
      const allocationsBefore = relevantAllocations
        .filter(alloc => new Date(alloc.endDate) < newStart)
        .sort((a,b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
      
      if (allocationsBefore.length > 0) {
        const lastAllocation = allocationsBefore[0];
        const gap = differenceInMinutes(newStart, new Date(lastAllocation.endDate));
        if (gap > GAP_THRESHOLD_MINUTES) {
          setGapWarning(`There is a gap of ${gap} minutes since the last allocation, which ended on ${format(new Date(lastAllocation.endDate), 'P p')}.`);
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

  }, [watchedValues, existingAllocations, isOpen, defaultValues]);


  useEffect(() => {
    if (!isOpen) {
      reset();
      setOverlapWarning(null);
      setGapWarning(null);
    }
  }, [isOpen, reset]);
  
  const handleFormSubmit = (data: AllocationFormValues) => {
    const startDate = combineDateTime(data.startDate, data.startTime);
    const endDate = combineDateTime(data.endDate, data.endTime);

    if (!startDate || !endDate || startDate >= endDate) {
        console.error("Invalid date/time range.");
        return;
    }

    const durationMinutes = differenceInMinutes(endDate, startDate);
    const totalGallons = convertToGallons(data.amount, data.unit, durationMinutes);

    onSubmit({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
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
            <SheetTitle>{defaultValues ? 'Edit Allocation' : 'New Allocation'}</SheetTitle>
            <SheetDescription>
              Set a water usage budget for a specific period for all or one of your users.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-6 overflow-y-auto py-6 pr-6 pl-1">
            <div className="space-y-4 pl-5">
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="startDate">Start Date</Label>
                        <Controller
                            name="startDate"
                            control={control}
                            render={({ field }) => <Input id="startDate" type="date" {...field} />}
                        />
                         {errors.startDate && (
                            <p className="text-sm text-destructive">{errors.startDate.message}</p>
                        )}
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="startTime">Start Time</Label>
                        <Controller
                            name="startTime"
                            control={control}
                            render={({ field }) => <Input id="startTime" type="time" {...field} />}
                        />
                         {errors.startTime && (
                            <p className="text-sm text-destructive">{errors.startTime.message}</p>
                        )}
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                     <div className="grid gap-2">
                        <Label htmlFor="endDate">End Date</Label>
                        <Controller
                            name="endDate"
                            control={control}
                            render={({ field }) => <Input id="endDate" type="date" {...field} />}
                        />
                         {errors.endDate && (
                            <p className="text-sm text-destructive">{errors.endDate.message}</p>
                        )}
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="endTime">End Time</Label>
                        <Controller
                            name="endTime"
                            control={control}
                            render={({ field }) => <Input id="endTime" type="time" {...field} />}
                        />
                        {errors.endTime && (
                            <p className="text-sm text-destructive">{errors.endTime.message}</p>
                        )}
                    </div>
                </div>
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
                        <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="gallons">Gallons (Total)</SelectItem>
                                <SelectItem value="acre-feet">Acre-Feet (Total)</SelectItem>
                                <SelectItem value="gpm">GPM (Rate)</SelectItem>
                                <SelectItem value="cfs">CFS (Rate)</SelectItem>
                                <SelectItem value="ac-ft/day">Ac-Ft/Day (Rate)</SelectItem>
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
                  <Select onValueChange={field.onChange} value={field.value}>
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
            <Button type="submit">{defaultValues ? 'Save Changes' : 'Create Allocation'}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
