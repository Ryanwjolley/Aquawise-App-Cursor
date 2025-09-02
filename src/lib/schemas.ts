import { z } from 'zod';
import type { Allocation, UsageEntry, WaterOrder, Notification } from '@/lib/data';

// Reusable date and id patterns
const ISO_DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/,'Invalid date (expected YYYY-MM-DD)');

export const UsageEntrySchema = z.object({
  userId: z.string().min(1),
  date: ISO_DATE,
  usage: z.number().nonnegative(),
});

export function parseUsageEntry(id: string, raw: unknown): UsageEntry | null {
  const parsed = UsageEntrySchema.safeParse(raw);
  if (!parsed.success) return null;
  return { id, ...(parsed.data as Omit<UsageEntry,'id'>) };
}

export const AllocationSchema = z.object({
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  gallons: z.number().nonnegative(),
  userId: z.string().optional(),
  userGroupId: z.string().optional(),
  companyId: z.string().min(1),
});

export function parseAllocation(id: string, raw: unknown): Allocation | null {
  const parsed = AllocationSchema.safeParse(raw);
  if (!parsed.success) return null;
  const data = parsed.data;
  // Basic temporal sanity: start <= end
  if (new Date(data.startDate).getTime() > new Date(data.endDate).getTime()) return null;
  return { id, ...(data as Omit<Allocation,'id'>) };
}

// Water Order
export const WaterOrderSchema = z.object({
  userId: z.string().min(1),
  companyId: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  amount: z.number().nonnegative(),
  unit: z.string().min(1),
  totalGallons: z.number().nonnegative(),
  status: z.enum(['pending','approved','rejected','completed']),
  createdAt: z.string().min(1),
  reviewedBy: z.string().optional(),
  reviewedAt: z.string().optional(),
  adminNotes: z.string().optional(),
});

export function parseWaterOrder(id: string, raw: unknown): WaterOrder | null {
  const parsed = WaterOrderSchema.safeParse(raw);
  if (!parsed.success) return null;
  const data = parsed.data;
  if (new Date(data.startDate).getTime() > new Date(data.endDate).getTime()) return null;
  return { id, ...(data as Omit<WaterOrder,'id'>) };
}

// Notification
export const NotificationSchema = z.object({
  userId: z.string().min(1),
  message: z.string().min(1),
  details: z.string().optional(),
  link: z.string().optional(),
  createdAt: z.string().min(1),
  isRead: z.boolean(),
});

export function parseNotification(id: string, raw: unknown): Notification | null {
  const parsed = NotificationSchema.safeParse(raw);
  if (!parsed.success) return null;
  return { id, ...(parsed.data as Omit<Notification,'id'>) };
}
