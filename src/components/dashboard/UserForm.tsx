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
import type { User, UserGroup } from "@/lib/data";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getGroupsByCompany } from "@/lib/data";


const phoneRegex = new RegExp(
  /^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9]+[)])?([-]?[\s]?[0-9])+$/
);


const userFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  mobileNumber: z.string().regex(phoneRegex, 'Invalid phone number').optional().or(z.literal('')),
  role: z.enum(["Admin", "Customer", "Admin & Customer"], {
    required_error: "Please select a role.",
  }),
  shares: z.coerce.number().int().min(0, "Shares must be a positive number.").optional(),
  notificationPreference: z.enum(["email", "mobile"], {
    required_error: "Please select a notification preference.",
  }),
  userGroupId: z.string().optional(),
});

type UserFormValues = z.infer<typeof userFormSchema>;

interface UserFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (data: Omit<User, 'id' | 'companyId' | 'role'> & { role: 'Admin' | 'Customer' | 'Admin & Customer' }) => void;
  defaultValues?: Partial<User>;
}

export function UserForm({
  isOpen,
  onOpenChange,
  onSubmit,
  defaultValues,
}: UserFormProps) {
  const { company } = useAuth();
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);

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
      mobileNumber: "",
      role: "Customer",
      shares: 0,
      notificationPreference: "email",
      userGroupId: undefined,
    },
  });

  useEffect(() => {
    if (company?.userGroupsEnabled && company.id) {
        getGroupsByCompany(company.id).then(setUserGroups);
    } else {
        setUserGroups([]);
    }
  }, [company])

  useEffect(() => {
    if (isOpen) {
        const valuesToReset = {
            name: defaultValues?.name || "",
            email: defaultValues?.email || "",
            mobileNumber: defaultValues?.mobileNumber || "",
            role: defaultValues?.role as UserFormValues['role'] || "Customer",
            shares: defaultValues?.shares || 0,
            notificationPreference: defaultValues?.notificationPreference || "email",
            userGroupId: defaultValues?.userGroupId || undefined,
        };
        reset(valuesToReset);
    } else {
      reset({ name: "", email: "", role: "Customer", shares: 0, mobileNumber: "", notificationPreference: "email", userGroupId: undefined });
    }
  }, [isOpen, defaultValues, reset]);

  const handleFormSubmit = (data: UserFormValues) => {
    const dataToSubmit = {
        ...data,
        userGroupId: data.userGroupId === 'none' ? undefined : data.userGroupId
    };
    onSubmit(dataToSubmit);
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <form
          onSubmit={handleSubmit(handleFormSubmit)}
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
          <div className="flex-1 space-y-6 py-6 overflow-y-auto pr-4">
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
            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="mobileNumber">Mobile Number</Label>
                <Controller
                  name="mobileNumber"
                  control={control}
                  render={({ field }) => <Input id="mobileNumber" type="tel" {...field} />}
                />
                {errors.mobileNumber && (
                  <p className="text-sm text-destructive">{errors.mobileNumber.message}</p>
                )}
              </div>
            </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                <Label htmlFor="role">Role</Label>
                <Controller
                    name="role"
                    control={control}
                    render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="Customer">Customer</SelectItem>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Admin & Customer">Admin & Customer</SelectItem>
                        </SelectContent>
                    </Select>
                    )}
                />
                {errors.role && (
                    <p className="text-sm text-destructive">{errors.role.message}</p>
                )}
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="shares">Shares</Label>
                    <Controller
                        name="shares"
                        control={control}
                        render={({ field }) => <Input id="shares" type="number" {...field} />}
                    />
                     {errors.shares && (
                        <p className="text-sm text-destructive">{errors.shares.message}</p>
                    )}
                </div>
            </div>
            {company?.userGroupsEnabled && (
                 <div className="grid gap-2">
                    <Label htmlFor="userGroupId">User Group</Label>
                    <Controller
                        name="userGroupId"
                        control={control}
                        render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value || 'none'}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a group (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {userGroups.map(group => (
                                    <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        )}
                    />
                    {errors.userGroupId && (
                        <p className="text-sm text-destructive">{errors.userGroupId.message}</p>
                    )}
                </div>
            )}
            <div className="grid gap-2">
                <Label htmlFor="notificationPreference">Notification Preference</Label>
                 <Controller
                    name="notificationPreference"
                    control={control}
                    render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                        <SelectValue placeholder="Select a preference" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="mobile">Mobile (SMS)</SelectItem>
                        </SelectContent>
                    </Select>
                    )}
                />
                {errors.notificationPreference && (
                    <p className="text-sm text-destructive">{errors.notificationPreference.message}</p>
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
