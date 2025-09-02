import type { Company, User } from '@/lib/data';
import { db } from '@/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { z } from 'zod';

// Firestore raw shapes (partial / optional) — kept narrow to avoid `any`.
// Validation schemas (kept local to avoid circular deps with data.ts pure types)
const NotificationSettingsSchema = z.object({
  allocationChangeAlerts: z.object({ enabled: z.boolean(), message: z.string().optional() }).optional(),
  thresholdAlerts: z.object({
    enabled: z.boolean(),
    thresholds: z.array(z.object({ percentage: z.number().min(0).max(100) })).optional().default([]),
    email: z.string().email().optional(),
    message: z.string().optional(),
  }).optional(),
  spikeAlerts: z.object({
    enabled: z.boolean(),
    percentage: z.number().min(0).max(100).optional(),
    email: z.string().email().optional(),
    message: z.string().optional(),
  }).optional(),
}).partial().optional();

const CompanySchema = z.object({
  name: z.string().min(1).default('Company'),
  defaultUnit: z.enum(['gallons','kgal','acre-feet','cubic-feet','cfs','gpm','acre-feet-day']).default('gallons'),
  userGroupsEnabled: z.boolean().default(false),
  waterOrdersEnabled: z.boolean().default(false),
  notificationSettings: NotificationSettingsSchema,
}).partial();

const UserSchema = z.object({
  name: z.string().min(1).default('User'),
  email: z.string().email().default(''),
  mobileNumber: z.string().optional(),
  role: z.string().min(1).default('Customer'),
  companyId: z.string().min(1),
  shares: z.number().int().nonnegative().optional(),
  notificationPreference: z.enum(['email','mobile']).default('email'),
  userGroupId: z.string().optional(),
});

export const fetchCompany = async (companyId: string): Promise<Company | null> => {
  try {
    const ref = doc(db, 'companies', companyId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const parsed = CompanySchema.safeParse(snap.data());
    if (!parsed.success) {
      console.warn('Company doc validation failed', parsed.error.flatten().fieldErrors);
      return null;
    }
    const data = parsed.data;
    const company: Company = {
      id: companyId,
      name: data.name ?? 'Company',
      defaultUnit: (data.defaultUnit as Company['defaultUnit']) ?? 'gallons',
      userGroupsEnabled: !!data.userGroupsEnabled,
      waterOrdersEnabled: !!data.waterOrdersEnabled,
      notificationSettings: data.notificationSettings as Company['notificationSettings'],
    };
    return company;
  } catch (e) {
    console.error('fetchCompany failed', e);
    return null;
  }
};

export const fetchUserProfile = async (
  companyId: string,
  userId: string
): Promise<User | null> => {
  try {
    const ref = doc(db, 'companies', companyId, 'users', userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    // We trust Firestore shape to match `User`; perform shallow validation of required keys.
    const parsed = UserSchema.safeParse({ ...snap.data(), companyId });
    if (!parsed.success) {
      console.warn('User doc validation failed', parsed.error.flatten().fieldErrors);
      return null;
    }
    const raw = parsed.data;
    const user: User = { id: userId, ...(raw as Omit<User, 'id'>) };
    return user;
  } catch (e) {
    console.error('fetchUserProfile failed', e);
    return null;
  }
};


