import { useEffect, useState, useMemo } from "react";
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
  SelectGroup
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Allocation, User, UserGroup, Unit } from "@/lib/data";
import { useAuth } from "@/contexts/AuthContext";
import { format, differenceInMinutes, addMinutes, subMinutes, parseISO, differenceInSeconds, differenceInDays } from "date-fns";
import { AlertTriangle } from "lucide-react";
import { useUnit } from "@/contexts/UnitContext";
import { getGroupsByCompany, CONVERSION_FACTORS_TO_GALLONS, CONVERSION_FACTORS_FROM_GALLONS } from "@/lib/data";


const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const allocationFormSchema = z.object({
  startDate: z.string().regex(dateRegex, "Invalid date format. Use YYYY-MM-DD."),
  endDate: z.string().regex(dateRegex, "Invalid date format. Use YYYY-MM-DD."),
  startTime: z.string().regex(timeRegex, "Invalid time format. Use HH:MM."),
  endTime: z.string().regex(timeRegex, "Invalid time format. Use HH:MM."),
  amount: z.coerce.number().positive({ message: "Amount must be positive." }),
  unit: z.enum(['gallons', 'kgal', 'acre-feet', 'cubic-feet', 'cfs', 'gpm', 'acre-feet-day']),
  appliesTo: z.string().min(1, { message: "Please select who this applies to." }),
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
  userGroups: UserGroup[];
  existingAllocations: Allocation[];
  defaultValues?: Allocation;
}


const combineDateTime = (dateStr: string, timeStr: string): Date | null => {
    if (!dateStr || !timeStr || !dateStr.match(dateRegex) || !timeStr.match(timeRegex)) return null;
    return parseISO(`${dateStr}T${timeStr}:00`);
};

export function AllocationForm({
  isOpen,
  onOpenChange,
  onSubmit,
  companyUsers,
  userGroups,
  existingAllocations,
  defaultValues
}: AllocationFormProps) {
  const { company } = useAuth();
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null);
  const [gapWarning, setGapWarning] = useState<string | null>(null);

  const formDefaultValues = useMemo(() => {
    const defaultUnit = company?.defaultUnit || 'gallons';
    if (defaultValues) {
      const displayAmount = defaultValues.gallons * (CONVERSION_FACTORS_FROM_GALLONS[defaultUnit] || 1);
      const start = new Date(defaultValues.startDate);
      const end = new Date(defaultValues.endDate);
      let appliesTo = "all";
      if (defaultValues.userId) {
        appliesTo = defaultValues.userId;
      } else if (defaultValues.userGroupId) {
        appliesTo = `group_${defaultValues.userGroupId}`;
      }

      return {
        amount: displayAmount,
        unit: defaultUnit,
        appliesTo: appliesTo,
        startDate: format(start, "yyyy-MM-dd"),
        startTime: format(start, "HH:mm"),
        endDate: format(end, "yyyy-MM-dd"),
        endTime: format(end, "HH:mm"),
      };
    }
    // For new allocation
    return {
      amount: 0,
      unit: defaultUnit,
      appliesTo: "all",
      startDate: format(new Date(), "yyyy-MM-dd"),
      endDate: format(new Date(), "yyyy-MM-dd"),
      startTime: "00:00",
      endTime: "23:59",
    };
  }, [defaultValues, company]);


  const {
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<AllocationFormValues>({
    resolver: zodResolver(allocationFormSchema),
    defaultValues: formDefaultValues
  });

  const watchedValues = watch();

  // When form opens, reset to the correct default values
  useEffect(() => {
    if (isOpen) {
      reset(formDefaultValues);
    }
  }, [isOpen, formDefaultValues, reset]);


  useEffect(() => {
    if (isOpen && watchedValues.startDate && watchedValues.endDate && watchedValues.startTime && watchedValues.endTime) {
      const newStart = combineDateTime(watchedValues.startDate, watchedValues.startTime);
      const newEnd = combineDateTime(watchedValues.endDate, watchedValues.endTime);

      if (!newStart || !newEnd || newStart >= newEnd) {
         setOverlapWarning(null);
         setGapWarning(null);
         return;
      }
      
      const isGroupAllocation = watchedValues.appliesTo?.startsWith('group_');
      const userId = !isGroupAllocation && watchedValues.appliesTo !== 'all' ? watchedValues.appliesTo : undefined;
      const groupId = isGroupAllocation ? watchedValues.appliesTo.replace('group_', '') : undefined;


      const relevantAllocations = existingAllocations.filter(alloc => 
        (
            (!userId && !groupId && !alloc.userId && !alloc.userGroupId) || // Both are "All users"
            (userId && alloc.userId === userId) || // Same user
            (groupId && alloc.userGroupId === groupId) // Same group
        ) &&
        alloc.id !== defaultValues?.id // Exclude the one being edited
      );

      // Check for overlaps
      const overlappingAlloc = relevantAllocations.find(alloc => {
        const existingStart = new Date(alloc.startDate);
        const existingEnd = new Date(alloc.endDate);
        return newStart < existingEnd && newEnd > existingStart;
      });

      if (overlappingAlloc) {
        setOverlapWarning(`This period overlaps with an existing allocation from ${format(new Date(overlappingAlloc.startDate), 'P p')} to ${format(new Date(overlappingAlloc.endDate), 'P p')}.`);
      } else {
        setOverlapWarning(null);
      }
      
      // Check for gaps
      const allocationsBefore = relevantAllocations
        .filter(alloc => new Date(alloc.endDate) <= newStart)
        .sort((a,b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
      
      if (allocationsBefore.length > 0) {
        const lastAllocation = allocationsBefore[0];
        const gap = differenceInMinutes(newStart, new Date(lastAllocation.endDate));
        if (gap > 1) { // A gap of more than a minute
          setGapWarning(`There is a gap since the last allocation, which ended on ${format(new Date(lastAllocation.endDate), 'P p')}.`);
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

  
  const handleFormSubmit = (data: AllocationFormValues) => {
    const startDate = combineDateTime(data.startDate, data.startTime);
    const endDate = combineDateTime(data.endDate, data.endTime);

    if (!startDate || !endDate || startDate >= endDate) {
        console.error("Invalid date/time range.");
        return;
    }

    let totalGallons = 0;
    const { amount, unit } = data;
    
    // Check if it's a simple volume conversion
    if (unit in CONVERSION_FACTORS_TO_GALLONS.volume) {
      totalGallons = amount * CONVERSION_FACTORS_TO_GALLONS.volume[unit as keyof typeof CONVERSION_FACTORS_TO_GALLONS.volume]!;
    } 
    // Check if it's a rate conversion
    else if (unit in CONVERSION_FACTORS_TO_GALLONS.rate) {
        const durationInSeconds = differenceInSeconds(endDate, startDate);
        switch(unit) {
            case 'cfs':
                totalGallons = amount * CONVERSION_FACTORS_TO_GALLONS.rate.cfs * durationInSeconds;
                break;
            case 'gpm':
                const durationInMinutes = durationInSeconds / 60;
                totalGallons = amount * CONVERSION_FACTORS_TO_GALLONS.rate.gpm * durationInMinutes;
                break;
            case 'acre-feet-day':
                // Add 1 to include the end day fully in the calculation.
                const durationInDays = (differenceInDays(endDate, startDate) || 1);
                totalGallons = amount * CONVERSION_FACTORS_TO_GALLONS.rate['acre-feet-day'] * durationInDays;
                break;
        }
    }


    const isGroupAllocation = data.appliesTo.startsWith('group_');
    const userId = !isGroupAllocation && data.appliesTo !== 'all' ? data.appliesTo : undefined;
    const userGroupId = isGroupAllocation ? data.appliesTo.replace('group_', '') : undefined;

    onSubmit({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        gallons: totalGallons,
        userId: userId,
        userGroupId: userGroupId,
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
              Set a water usage budget for a specific period. The final value will be stored in gallons.
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
                    <Label htmlFor="amount">Amount / Rate</Label>
                    <Controller
                        name="amount"
                        control={control}
                        render={({ field }) => <Input id="amount" type="number" step="any" {...field} />}
                    />
                    {errors.amount && (
                        <p className="text-sm text-destructive">{errors.amount.message}</p>
                    )}
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="unit">Unit</Label>
                    <Controller
                        name="unit"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger id="unit">
                                    <SelectValue placeholder="Select unit" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <Label className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Volume</Label>
                                        <SelectItem value="gallons">Gallons</SelectItem>
                                        <SelectItem value="kgal">kGal (Thousands)</SelectItem>
                                        <SelectItem value="acre-feet">Acre-Feet</SelectItem>
                                        <SelectItem value="cubic-feet">Cubic Feet</SelectItem>
                                    </SelectGroup>
                                     <SelectGroup>
                                        <Label className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Flow Rate</Label>
                                        <SelectItem value="gpm">Gallons/Min (GPM)</SelectItem>
                                        <SelectItem value="cfs">Cubic Ft/Sec (CFS)</SelectItem>
                                        <SelectItem value="acre-feet-day">Acre-Feet/Day</SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>
            </div>

            <div className="grid gap-2 pl-5">
              <Label htmlFor="appliesTo">Applies To</Label>
              <Controller
                name="appliesTo"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a user or group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      {company?.userGroupsEnabled && userGroups.length > 0 && (
                        <SelectGroup>
                            <Label className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Groups</Label>
                             {userGroups.map(group => (
                                <SelectItem key={group.id} value={`group_${group.id}`}>{group.name}</SelectItem>
                            ))}
                        </SelectGroup>
                      )}
                      <SelectGroup>
                        <Label className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Users</Label>
                         {companyUsers.map(user => (
                            <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.appliesTo && (
                <p className="text-sm text-destructive">{errors.appliesTo.message}</p>
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
