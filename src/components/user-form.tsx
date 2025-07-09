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
import type { User } from '@/firestoreService';
import React from 'react';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  shares: z.coerce.number().int().min(0, { message: 'Shares must be a positive number.' }),
});

type UserFormProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (user: z.infer<typeof formSchema>) => void;
  user: Partial<User> | null;
};

export function UserForm({ isOpen, onOpenChange, onSave, user }: UserFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user?.name || '',
      shares: user?.shares || 0,
    },
  });

  React.useEffect(() => {
    form.reset({
      name: user?.name || '',
      shares: user?.shares || 0,
    });
  }, [user, form, isOpen]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    onSave(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{user?.id ? 'Edit User' : 'Add New User'}</DialogTitle>
          <DialogDescription>
            {user?.id ? 'Update the details for this user.' : 'Enter the details for the new user.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Jane Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="shares"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Water Shares</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g. 5" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
