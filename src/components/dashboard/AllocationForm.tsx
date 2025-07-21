
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
} from "@/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Allocation, User } from "@/lib/data";
import { DateRangeSelector } from "./DateRangeSelector";
import type { DateRange } from "react-day-picker";
import { format } from "date-fns";

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

export function AllocationForm({
  isOpen,
  onOpenChange,
  onSubmit,
  companyUsers
}: AllocationFormProps) {
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

  const dateRange = watch("dateRange");

  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);
  
  const handleFormSubmit = (data: AllocationFormValues) => {
    const days = (data.dateRange.to!.getTime() - data.dateRange.from!.getTime()) / (1000 * 3600 * 24) + 1;
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
          <div className="flex-1 space-y-6 py-6">
            <div className="grid gap-2">
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
            <div className="grid grid-cols-3 gap-4">
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
                <p className="text-sm text-destructive">{errors.amount?.message || errors.unit?.message}</p>
            )}

            <div className="grid gap-2">
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
          <SheetFooter>
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
