import { useEffect } from "react";
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
import { format, parseISO, differenceInSeconds, differenceInDays } from "date-fns";
import { CONVERSION_FACTORS_TO_GALLONS, Unit } from "@/lib/data";


const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const waterOrderFormSchema = z.object({
  startDate: z.string().regex(dateRegex, "Invalid date format. Use YYYY-MM-DD."),
  endDate: z.string().regex(dateRegex, "Invalid date format. Use YYYY-MM-DD."),
  startTime: z.string().regex(timeRegex, "Invalid time format. Use HH:MM."),
  endTime: z.string().regex(timeRegex, "Invalid time format. Use HH:MM."),
  amount: z.coerce.number().positive({ message: "Amount must be positive." }),
  unit: z.enum(['gallons', 'kgal', 'acre-feet', 'cubic-feet', 'cfs', 'gpm', 'acre-feet-day']),
}).refine(data => {
    const start = combineDateTime(data.startDate, data.startTime);
    const end = combineDateTime(data.endDate, data.endTime);
    return start && end && start < end;
}, {
    message: "End date and time must be after start date and time.",
    path: ["endDate"],
});


type WaterOrderFormValues = z.infer<typeof waterOrderFormSchema>;

interface WaterOrderFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (data: Omit<any, 'id' | 'companyId' | 'userId' | 'status' | 'createdAt'>) => void;
}

const combineDateTime = (dateStr: string, timeStr: string): Date | null => {
    if (!dateStr || !timeStr || !dateStr.match(dateRegex) || !timeStr.match(timeRegex)) return null;
    return parseISO(`${dateStr}T${timeStr}:00`);
};

export function WaterOrderForm({
  isOpen,
  onOpenChange,
  onSubmit,
}: WaterOrderFormProps) {
  
  const {
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<WaterOrderFormValues>({
    resolver: zodResolver(waterOrderFormSchema),
    defaultValues: {
        startDate: format(new Date(), "yyyy-MM-dd"),
        startTime: "08:00",
        endDate: format(new Date(), "yyyy-MM-dd"),
        endTime: "16:00",
        amount: 1,
        unit: 'cfs',
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
  
  const handleFormSubmit = (data: WaterOrderFormValues) => {
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
        }
    }
    
    onSubmit({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        amount: data.amount,
        unit: data.unit,
        totalGallons,
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
            <SheetTitle>Request Water Order</SheetTitle>
            <SheetDescription>
              Submit a request to run water for a specific time period at a specified amount or flow rate.
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
                                        <SelectItem value="gpm">GPM</SelectItem>
                                        <SelectItem value="cfs">CFS</SelectItem>
                                        <SelectItem value="acre-feet-day">Acre-Feet/Day</SelectItem>
                                     </SelectGroup>
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>
            </div>
          </div>
          <SheetFooter className="mt-auto">
            <SheetClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </SheetClose>
            <Button type="submit">Submit Request</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
