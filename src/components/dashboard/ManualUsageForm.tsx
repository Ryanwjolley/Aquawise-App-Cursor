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
  SelectGroup
} from "@/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { User, Unit } from "@/lib/data";
import { format, parseISO, differenceInSeconds, differenceInDays } from "date-fns";
import { convertToGallons } from "@/lib/utils";


const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const manualUsageFormSchema = z.object({
  startDate: z.string().regex(dateRegex, "Invalid date format. Use YYYY-MM-DD."),
  endDate: z.string().regex(dateRegex, "Invalid date format. Use YYYY-MM-DD."),
  startTime: z.string().regex(timeRegex, "Invalid time format. Use HH:MM."),
  endTime: z.string().regex(timeRegex, "Invalid time format. Use HH:MM."),
  amount: z.coerce.number().positive({ message: "Amount must be positive." }),
  unit: z.enum(['gallons', 'kgal', 'acre-feet', 'cubic-feet', 'cfs', 'gpm', 'acre-feet-day']),
  userId: z.string().min(1, { message: "Please select a user." }),
}).refine(data => {
    const start = combineDateTime(data.startDate, data.startTime);
    const end = combineDateTime(data.endDate, data.endTime);
    return start && end && start < end;
}, {
    message: "End date and time must be after start date and time.",
    path: ["endDate"],
});


type ManualUsageFormValues = z.infer<typeof manualUsageFormSchema>;

interface ManualUsageFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (entries: Omit<any, 'id'>[]) => void;
  companyUsers: User[];
}

const combineDateTime = (dateStr: string, timeStr: string): Date | null => {
    if (!dateStr || !timeStr || !dateStr.match(dateRegex) || !timeStr.match(timeRegex)) return null;
    return parseISO(`${dateStr}T${timeStr}:00`);
};

export function ManualUsageForm({
  isOpen,
  onOpenChange,
  onSubmit,
  companyUsers
}: ManualUsageFormProps) {
  
  const {
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ManualUsageFormValues>({
    resolver: zodResolver(manualUsageFormSchema),
    defaultValues: {
        startDate: format(new Date(), "yyyy-MM-dd"),
        startTime: "00:00",
        endDate: format(new Date(), "yyyy-MM-dd"),
        endTime: "23:59",
        amount: 0,
        unit: 'gallons',
        userId: undefined,
    }
  });

  const watchedStartDate = watch("startDate");
  const endDateValue = watch("endDate");

  // When start date changes, if it's after end date, update end date.
  useEffect(() => {
    const currentStartDate = new Date(watchedStartDate);
    const currentEndDate = new Date(endDateValue);
    if (currentStartDate > currentEndDate) {
      setValue("endDate", watchedStartDate);
    }
  }, [watchedStartDate, endDateValue, setValue]);


  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);
  
  const handleFormSubmit = (data: ManualUsageFormValues) => {
    const startDate = combineDateTime(data.startDate, data.startTime);
    const endDate = combineDateTime(data.endDate, data.endTime);

    if (!startDate || !endDate || startDate >= endDate) {
        console.error("Invalid date/time range.");
        return;
    }

  const durationHours = differenceInSeconds(endDate, startDate) / 3600;
  const totalGallons = convertToGallons(data.amount, data.unit, durationHours);

    const entries = [];
    // Add 1 to include the end day fully in the calculation for day-based distribution
    const totalDays = (differenceInDays(endDate, startDate) || 0) + 1;
    const dailyGallons = totalGallons / totalDays;
    
    let currentDate = new Date(startDate);
    while(currentDate <= endDate) {
        entries.push({
            userId: data.userId,
            date: format(currentDate, 'yyyy-MM-dd'),
            usage: dailyGallons // Store usage in gallons
        });
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    onSubmit(entries);
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex h-full flex-col"
        >
          <SheetHeader>
            <SheetTitle>Manual Usage Entry</SheetTitle>
            <SheetDescription>
              Enter a water usage record for a user over a specific time period. The usage will be distributed evenly across the days.
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
              <Label htmlFor="userId">User</Label>
              <Controller
                name="userId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                    <SelectContent>
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
            <Button type="submit">Create Usage Record</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
