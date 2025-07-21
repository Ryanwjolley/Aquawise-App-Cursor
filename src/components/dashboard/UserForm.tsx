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
import type { User } from "@/lib/data";
import { useEffect } from "react";

const userFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  role: z.enum(["Admin", "Customer"], {
    required_error: "Please select a role.",
  }),
});

type UserFormValues = z.infer<typeof userFormSchema>;

interface UserFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (data: UserFormValues) => void;
  defaultValues?: Partial<User>;
}

export function UserForm({
  isOpen,
  onOpenChange,
  onSubmit,
  defaultValues,
}: UserFormProps) {
  const {
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "Customer",
    },
  });

  useEffect(() => {
    if (isOpen && defaultValues) {
      reset(defaultValues);
    } else if (!isOpen) {
      reset({ name: "", email: "", role: "Customer" });
    }
  }, [isOpen, defaultValues, reset]);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex h-full flex-col"
        >
          <SheetHeader>
            <SheetTitle>
              {defaultValues?.id ? "Edit User" : "Add New User"}
            </SheetTitle>
            <SheetDescription>
              {defaultValues?.id
                ? "Update the details for this user."
                : "Invite a new user to your organization."}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-6 py-6">
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name</Label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => <Input id="name" {...field} />}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Controller
                name="email"
                control={control}
                render={({ field }) => <Input id="email" type="email" {...field} />}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Customer">Customer</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.role && (
                <p className="text-sm text-destructive">{errors.role.message}</p>
              )}
            </div>
          </div>
          <SheetFooter>
            <SheetClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </SheetClose>
            <Button type="submit">Save User</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
