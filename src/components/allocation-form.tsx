
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from './ui/calendar';
import { cn, GALLONS_PER_ACRE_FOOT, GPM_TO_GALLONS_PER_SECOND, CFS_TO_GALLONS_PER_SECOND } from '@/lib/utils';
import { format, differenceInSeconds } from 'date-fns';
import React from 'react';
import type { Allocation } from '@/firestoreService';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const formSchema = z.object({
  startDate: z.date({ required_error: 'A start date is required.' }),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Invalid time format. Use HH:MM.' }),
  endDate: z.date({ required_error: 'An end date is required.' }),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Invalid time format. Use HH:MM.' }),
  inputType: z.enum(['volume', 'flow'], { required_error: 'You must select an input type.' }),
  inputValue: z.coerce.number().min(0, { message: 'Value must be a positive number.' }),
  volumeUnit: z.enum(['gallons', 'acre-feet']).optional(),
  flowUnit: z.enum(['gpm', 'cfs']).optional(),
}).refine(data => {
    const startDateTime = new Date(data.startDate);
    const [startHours, startMinutes] = data.startTime.split(':').map(Number);
    startDateTime.setHours(startHours, startMinutes);

    const endDateTime = new Date(data.endDate);
    const [endHours, endMinutes] = data.endTime.split(':').map(Number);
    endDateTime.setHours(endHours, endMinutes);
    
    return endDateTime > startDateTime;
}, {
    message: 'End date and time must be after start date and time.',
    path: ['endDate'],
}).refine(data => data.inputType === 'volume' ? !!data.volumeUnit : true, {
    message: 'Please select a unit for volume.',
    path: ['volumeUnit'],
}).refine(data => data.inputType === 'flow' ? !!data.flowUnit : true, {
    message: 'Please select a unit for flow rate.',
    path: ['flowUnit'],
});

type AllocationFormProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { id?: string, startDate: Date, endDate: Date, totalAllocationGallons: number }) => void;
  allocation: Allocation | null;
};

export function AllocationForm({ isOpen, onOpenChange, onSave, allocation }: AllocationFormProps) {
  const isEditMode = !!allocation;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      startTime: '00:00',
      endTime: '23:59',
      inputType: 'volume',
      inputValue: 1000000,
      volumeUnit: 'gallons',
    },
  });

  const inputType = form.watch('inputType');

  React.useEffect(() => {
    if (isOpen) {
        if (isEditMode && allocation) {
            form.reset({
                startDate: allocation.startDate,
                startTime: format(allocation.startDate, 'HH:mm'),
                endDate: allocation.endDate,
                endTime: format(allocation.endDate, 'HH:mm'),
                inputType: 'volume', // Edit mode defaults to volume
                inputValue: allocation.totalAllocationGallons,
                volumeUnit: 'gallons',
                flowUnit: undefined,
            });
        } else {
            form.reset({
                startDate: new Date(),
                startTime: '00:00',
                endDate: new Date(),
                endTime: '23:59',
                inputType: 'volume',
                inputValue: 1000000,
                volumeUnit: 'gallons',
                flowUnit: undefined,
            });
        }
    }
  }, [form, isOpen, isEditMode, allocation]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const { startDate, startTime, endDate, endTime, inputType, inputValue, volumeUnit, flowUnit } = values;
    
    const finalStartDate = new Date(startDate);
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    finalStartDate.setHours(startHours, startMinutes, 0, 0);

    const finalEndDate = new Date(endDate);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    finalEndDate.setHours(endHours, endMinutes, 0, 0);

    let totalAllocationGallons = 0;

    if (inputType === 'volume') {
      if (volumeUnit === 'acre-feet') {
        totalAllocationGallons = inputValue * GALLONS_PER_ACRE_FOOT;
      } else {
        totalAllocationGallons = inputValue; // Assumed gallons
      }
    } else { // flow
      const durationSeconds = differenceInSeconds(finalEndDate, finalStartDate);
      if (flowUnit === 'gpm') {
        totalAllocationGallons = inputValue * GPM_TO_GALLONS_PER_SECOND * durationSeconds;
      } else { // cfs
        totalAllocationGallons = inputValue * CFS_TO_GALLONS_PER_SECOND * durationSeconds;
      }
    }

    onSave({ id: allocation?.id, startDate: finalStartDate, endDate: finalEndDate, totalAllocationGallons: Math.round(totalAllocationGallons) });
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Allocation' : 'Create New Allocation'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update the details for this allocation period.' : 'Define a time period and the total water allocation available for all users during that time.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
             <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Start Date</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                )}
                                >
                                {field.value ? (
                                    format(field.value, "PPP")
                                ) : (
                                    <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Start Time (HH:MM)</FormLabel>
                        <FormControl>
                            <Input placeholder="00:00" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>End Date</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                )}
                                >
                                {field.value ? (
                                    format(field.value, "PPP")
                                ) : (
                                    <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date < form.getValues('startDate')}
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>End Time (HH:MM)</FormLabel>
                        <FormControl>
                            <Input placeholder="23:59" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
             <FormField
                control={form.control}
                name="inputType"
                render={({ field }) => (
                    <FormItem className="space-y-3">
                    <FormLabel>Input Type</FormLabel>
                    <FormControl>
                        <RadioGroup
                        onValueChange={(value) => {
                            field.onChange(value);
                            if (value === 'volume') {
                                form.setValue('flowUnit', undefined);
                                if (!form.getValues('volumeUnit')) form.setValue('volumeUnit', 'gallons');
                            } else {
                                form.setValue('volumeUnit', undefined);
                                if (!form.getValues('flowUnit')) form.setValue('flowUnit', 'gpm');
                            }
                        }}
                        defaultValue={field.value}
                        className="flex items-center space-x-4"
                        disabled={isEditMode}
                        >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                            <RadioGroupItem value="volume" />
                            </FormControl>
                            <FormLabel className="font-normal">Total Volume</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                            <RadioGroupItem value="flow" />
                            </FormControl>
                            <FormLabel className="font-normal">Flow Rate</FormLabel>
                        </FormItem>
                        </RadioGroup>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="inputValue"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>
                            {inputType === 'volume' ? 'Total Volume' : 'Flow Rate'}
                        </FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="e.g. 1000000" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                {inputType === 'volume' && (
                    <FormField
                        control={form.control}
                        name="volumeUnit"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Unit</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a unit" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                <SelectItem value="gallons">Gallons</SelectItem>
                                <SelectItem value="acre-feet">Acre-Feet</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
                 {inputType === 'flow' && (
                    <FormField
                        control={form.control}
                        name="flowUnit"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Unit</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a unit" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                <SelectItem value="gpm">GPM (Gallons per Minute)</SelectItem>
                                <SelectItem value="cfs">CFS (Cubic Feet per Second)</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">{isEditMode ? 'Save Changes' : 'Create Allocation'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
