
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
import { format, parseISO, differenceInSeconds } from "date-fns";
import { CONVERSION_FACTORS_TO_GALLONS } from "@/lib/data";


const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const waterOrderFormSchema = z.object({
  startDate: z.string().regex(dateRegex, "Invalid date format. Use YYYY-MM-DD."),
  endDate: z.string().regex(dateRegex, "Invalid date format. Use YYYY-MM-DD."),
  startTime: z.string().regex(timeRegex, "Invalid time format. Use HH:MM."),
  endTime: z.string().regex(timeRegex, "Invalid time format. Use HH:MM."),
  flowRate: z.coerce.number().positive({ message: "Flow rate must be positive." }),
  flowUnit: z.enum(['cfs', 'gpm']),
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
    formState: { errors },
  } = useForm<WaterOrderFormValues>({
    resolver: zodResolver(waterOrderFormSchema),
    defaultValues: {
        startDate: format(new Date(), "yyyy-MM-dd"),
        startTime: "08:00",
        endDate: format(new Date(), "yyyy-MM-dd"),
        endTime: "16:00",
        flowRate: 1,
        flowUnit: 'cfs',
    }
  });


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
    const { flowRate, flowUnit } = data;
    
    const durationInSeconds = differenceInSeconds(endDate, startDate);
    switch(flowUnit) {
        case 'cfs':
            totalGallons = flowRate * CONVERSION_FACTORS_TO_GALLONS.rate.cfs * durationInSeconds;
            break;
        case 'gpm':
            const durationInMinutes = durationInSeconds / 60;
            totalGallons = flowRate * CONVERSION_FACTORS_TO_GALLONS.rate.gpm * durationInMinutes;
            break;
    }
    
    onSubmit({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        flowRate: data.flowRate,
        flowUnit: data.flowUnit,
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
              Submit a request to run water for a specific time period at a specified flow rate.
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
                    <Label htmlFor="flowRate">Flow Rate</Label>
                    <Controller
                        name="flowRate"
                        control={control}
                        render={({ field }) => <Input id="flowRate" type="number" step="any" {...field} />}
                    />
                    {errors.flowRate && (
                        <p className="text-sm text-destructive">{errors.flowRate.message}</p>
                    )}
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="flowUnit">Unit</Label>
                    <Controller
                        name="flowUnit"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger id="flowUnit">
                                    <SelectValue placeholder="Select unit" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cfs">CFS</SelectItem>
                                    <SelectItem value="gpm">GPM</SelectItem>
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
