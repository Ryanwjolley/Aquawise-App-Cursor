
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
import { getUnitLabel, CONVERSION_FACTORS } from "@/lib/data";
import { useAuth } from "@/contexts/AuthContext";
import { format, differenceInMinutes, addMinutes, subMinutes, parseISO } from "date-fns";
import { AlertTriangle } from "lucide-react";


const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const allocationFormSchema = z.object({
  startDate: z.string().regex(dateRegex, "Invalid date format. Use YYYY-MM-DD."),
  endDate: z.string().regex(dateRegex, "Invalid date format. Use YYYY-MM-DD."),
  startTime: z.string().regex(timeRegex, "Invalid time format. Use HH:MM."),
  endTime: z.string().regex(timeRegex, "Invalid time format. Use HH:MM."),
  amount: z.coerce.number().positive({ message: "Amount must be positive." }),
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
  const { company } = useAuth();
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null);
  const [gapWarning, setGapWarning] = useState<string | null>(null);

  const defaultUnit = company?.defaultUnit || 'gallons';
  const unitLabel = getUnitLabel(defaultUnit);
  const conversionFactorFromGallons = CONVERSION_FACTORS[defaultUnit];

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
        // Convert the stored gallon value to the company's default unit for display
        const displayAmount = defaultValues.gallons * conversionFactorFromGallons;
        const start = new Date(defaultValues.startDate);
        const end = new Date(defaultValues.endDate);
        reset({
          amount: displayAmount,
          userId: defaultValues.userId || "all",
          startDate: format(start, "yyyy-MM-dd"),
          startTime: format(start, "HH:mm"),
          endDate: format(end, "yyyy-MM-dd"),
          endTime: format(end, "HH:mm"),
        });
      } else {
         reset({
          amount: 0,
          userId: "all",
          startDate: format(new Date(), "yyyy-MM-dd"),
          endDate: format(new Date(), "yyyy-MM-dd"),
          startTime: "00:00",
          endTime: "23:59",
        });
      }
    }
  }, [isOpen, defaultValues, reset, conversionFactorFromGallons]);
  
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

    // Convert the input amount (which is in the company's default unit) back to gallons for storage
    const totalGallons = data.amount / conversionFactorFromGallons;

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
              Set a water usage budget for a specific period for all or one of your users. Values are in the company's default unit ({unitLabel}).
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
            
            <div className="grid gap-2 pl-5">
              <Label htmlFor="amount">Amount (in {unitLabel})</Label>
               <Controller
                  name="amount"
                  control={control}
                  render={({ field }) => <Input id="amount" type="number" {...field} />}
              />
               {errors.amount && (
                  <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}
            </div>

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
