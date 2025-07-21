
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn, GALLONS_PER_ACRE_FOOT, GPM_TO_GALLONS_PER_SECOND, CFS_TO_GALLONS_PER_SECOND } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import type { Allocation, AllocationData } from '@/firestoreService';
import React, { useEffect } from 'react';
import { format, set, differenceInSeconds } from 'date-fns';

const timeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

const formSchema = z.object({
  id: z.string().optional(),
  startDate: z.date({ required_error: 'Start date is required.' }),
  startTime: z.string().regex(timeRegex, { message: 'Invalid time format. Use HH:MM.' }),
  endDate: z.date({ required_error: 'End date is required.' }),
  endTime: z.string().regex(timeRegex, { message: 'Invalid time format. Use HH:MM.' }),
  inputType: z.enum(['volume', 'flow']),
  inputValue: z.coerce.number().min(0.0001, { message: 'Value must be greater than 0.' }),
  volumeUnit: z.enum(['gallons', 'acre-feet']).optional(),
  flowUnit: z.enum(['gpm', 'cfs']).optional(),
}).refine(data => {
  if (!data.startDate || !data.endDate) {
    return true; // Let the required fields handle this.
  }
  const startDateTime = set(data.startDate, {
    hours: parseInt(data.startTime.split(':')[0]),
    minutes: parseInt(data.startTime.split(':')[1]),
  });
  const endDateTime = set(data.endDate, {
    hours: parseInt(data.endTime.split(':')[0]),
    minutes: parseInt(data.endTime.split(':')[1]),
  });
  return endDateTime > startDateTime;
}, {
  message: 'End date and time must be after the start date and time.',
  path: ['endDate'],
});


type AllocationFormProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (allocation: AllocationData) => void;
  allocation: Allocation | null;
};

export function AllocationForm({ isOpen, onOpenChange, onSave, allocation }: AllocationFormProps) {
  const isEditMode = !!allocation;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      inputType: 'volume',
      volumeUnit: 'gallons',
      flowUnit: 'gpm',
    },
  });

  const { reset } = form;

  useEffect(() => {
    if (isOpen) {
        if (allocation) {
            reset({
              id: allocation.id,
              startDate: allocation.startDate,
              startTime: format(allocation.startDate, 'HH:mm'),
              endDate: allocation.endDate,
              endTime: format(allocation.endDate, 'HH:mm'),
              inputType: allocation.inputType || 'volume',
              inputValue: allocation.inputValue || 0,
              volumeUnit: allocation.volumeUnit || 'gallons',
              flowUnit: allocation.flowUnit || 'gpm',
            });
        } else {
            reset({
              id: undefined,
              startDate: undefined,
              endDate: undefined,
              startTime: '00:00',
              endTime: '23:59',
              inputType: 'volume',
              inputValue: undefined,
              volumeUnit: 'gallons',
              flowUnit: 'gpm',
            });
        }
    }
  }, [allocation, isOpen, reset]);


  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const startDateTime = set(values.startDate, {
        hours: parseInt(values.startTime.split(':')[0]),
        minutes: parseInt(values.startTime.split(':')[1]),
        seconds: 0,
        milliseconds: 0,
    });
    const endDateTime = set(values.endDate, {
        hours: parseInt(values.endTime.split(':')[0]),
        minutes: parseInt(values.endTime.split(':')[1]),
        seconds: 0,
        milliseconds: 0,
    });

    let totalAllocationGallons = 0;
    if (values.inputType === 'volume') {
        totalAllocationGallons = values.volumeUnit === 'acre-feet' 
            ? values.inputValue * GALLONS_PER_ACRE_FOOT 
            : values.inputValue;
    } else { // 'flow'
        const durationSeconds = differenceInSeconds(endDateTime, startDateTime);
        const gps = values.flowUnit === 'gpm' 
            ? values.inputValue * GPM_TO_GALLONS_PER_SECOND 
            : values.inputValue * CFS_TO_GALLONS_PER_SECOND;
        totalAllocationGallons = gps * durationSeconds;
    }

    onSave({
      ...values,
      id: allocation?.id,
      startDate: startDateTime,
      endDate: endDateTime,
      totalAllocationGallons: totalAllocationGallons,
    });
    onOpenChange(false);
  };

  const inputType = form.watch('inputType');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Allocation' : 'Create New Allocation'}</DialogTitle>
          <DialogDescription>
            Define a period and the total amount of water available for all users.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                                            className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                                        >
                                            {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent 
                                    className="w-auto p-0" 
                                    align="start"
                                    onInteractOutside={(e) => e.preventDefault()}
                                >
                                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
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
                            <FormLabel>Start Time (24h)</FormLabel>
                            <FormControl>
                                <Input placeholder="HH:MM" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
             <div className="grid grid-cols-2 gap-4">
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
                                            className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                                        >
                                            {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent 
                                    className="w-auto p-0" 
                                    align="start"
                                    onInteractOutside={(e) => e.preventDefault()}
                                >
                                    <Calendar
                                        mode="single"
                                        selected={field.value}
                                        onSelect={field.onChange}
                                        disabled={(date) => date < (form.getValues('startDate') || new Date(0))}
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
                            <FormLabel>End Time (24h)</FormLabel>
                            <FormControl>
                                <Input placeholder="HH:MM" {...field} />
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
                  <FormLabel>Allocation Method</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex items-center space-x-4"
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
                            <FormLabel>{inputType === 'volume' ? 'Total Volume' : 'Flow Rate'}</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="e.g. 1000" {...field} onChange={e => field.onChange(e.target.value === '' ? null : e.target.valueAsNumber)} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 {inputType === 'volume' ? (
                     <FormField
                        control={form.control}
                        name="volumeUnit"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Unit</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="gallons">Gallons</SelectItem>
                                        <SelectItem value="acre-feet">Acre-Feet</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        )}
                        />
                 ) : (
                    <FormField
                        control={form.control}
                        name="flowUnit"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Unit</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="gpm">GPM (Gallons per Minute)</SelectItem>
                                        <SelectItem value="cfs">CFS (Cubic Feet per Second)</SelectItem>
                                    </SelectContent>
                                </Select>
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
