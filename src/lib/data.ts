

import { differenceInDays, max, min, parseISO } from "date-fns";
import type { DateRange } from "react-day-picker";

export type Unit = 'gallons' | 'kgal' | 'acre-feet' | 'cubic-feet' | 'cfs' | 'gpm' | 'acre-feet-day';
export type UnitLabel = 'Gallons' | 'kGal' | 'Acre-Feet' | 'Cubic Feet' | 'CFS' | 'GPM' | 'Ac-Ft/Day';

// Conversion factors for direct volume or for calculating total volume from a rate.
export const CONVERSION_FACTORS_TO_GALLONS = {
  volume: {
    'gallons': 1,
    'kgal': 1000,
    'acre-feet': 325851,
    'cubic-feet': 7.48052,
  },
  rate: {
    'gpm': 1, // Gallons per minute
    'cfs': 448.831, // Cubic feet per second to gallons per minute
    'acre-feet-day': 325851, // Acre-feet per day to gallons
  }
};


export const CONVERSION_FACTORS_FROM_GALLONS: Record<Exclude<Unit, 'cfs' | 'gpm' | 'acre-feet-day'>, number> = {
    'gallons': 1,
    'kgal': 1 / 1000,
    'acre-feet': 1 / 325851,
    'cubic-feet': 1/ 7.48052,
};


export type Company = {
  id: string;
  name: string;
  defaultUnit: Unit;
  userGroupsEnabled: boolean;
  waterOrdersEnabled: boolean;
  notificationSettings?: NotificationSettings;
};

export type User = {
  id: string;
  name: string;
  email: string;
  mobileNumber?: string;
  role: 'Admin' | 'Customer' | 'Admin & Customer' | 'Super Admin';
  companyId: string;
  shares?: number;
  notificationPreference: 'email' | 'mobile';
  userGroupId?: string;
};

export type UserGroup = {
    id: string;
    name: string;
    companyId: string;
}

export type Allocation = {
  id: string;
  startDate: string; // ISO 8601 format
  endDate: string; // ISO 8601 format
  gallons: number;
  userId?: string; // Specific user this applies to
  userGroupId?: string; // Specific group this applies to
  companyId: string;
};

export type WaterAvailability = {
  id: string;
  startDate: string; // ISO 8601 format
  endDate: string; // ISO 8601 format
  gallons: number;
  companyId: string;
};

export type WaterOrder = {
    id: string;
    userId: string;
    companyId: string;
    startDate: string; // ISO 8601 format
    endDate: string; // ISO 8601 format
    amount: number; // The value entered by the user
    unit: Unit; // The unit selected by the user
    totalGallons: number; // Pre-calculated total volume
    status: 'pending' | 'approved' | 'rejected' | 'completed';
    createdAt: string; // ISO 8601 format
    reviewedBy?: string; // userId of admin
    reviewedAt?: string; // ISO 8601 format
    adminNotes?: string;
};

export type Notification = {
    id: string;
    userId: string;
    message: string;
    details: string; // For the modal/email view
    link?: string; // Optional link for the modal action button
    createdAt: string; // ISO 8601 format
    isRead: boolean;
}

export type NotificationSettings = {
  allocationChangeAlerts: { enabled: boolean; message?: string; };
  thresholdAlerts: { enabled: boolean; thresholds: { percentage: number }[]; email: string; message?: string; };
  spikeAlerts: { enabled: boolean; percentage: number; email: string; message?: string; };
}
// --- Pure helpers and types only; all data access now lives in Firestore modules ---

/**
 * Calculates the portion of an allocation that falls within a given date range.
 */
const getProportionalGallons = (allocation: Allocation, range: DateRange): number => {
    if (!range.from || !range.to) return 0;

    const allocStart = parseISO(allocation.startDate);
    const allocEnd = parseISO(allocation.endDate);

    const overlapStart = max([range.from, allocStart]);
    const overlapEnd = min([range.to, allocEnd]);

    if (overlapStart >= overlapEnd) {
        return 0;
    }

    const overlapDays = differenceInDays(overlapEnd, overlapStart) + 1;
    const totalAllocDays = differenceInDays(allocEnd, allocStart) + 1;

    if (totalAllocDays <= 0) return 0;

    return (allocation.gallons / totalAllocDays) * overlapDays;
};


/**
 * Calculates a user's total allocation for a given period, accounting for their
 * proportional share of company-wide and group-wide allocations.
 */
export const calculateUserAllocation = (user: User, allCompanyUsers: User[], allAllocations: Allocation[], range: DateRange): number => {
    let totalGallons = 0;

    for (const alloc of allAllocations) {
        const proportionalGallons = getProportionalGallons(alloc, range);
        if (proportionalGallons === 0) continue;

        // 1. Allocation is specifically for the user
        if (alloc.userId === user.id) {
            totalGallons += proportionalGallons;
            continue;
        }

        // 2. Allocation is for the user's group
        if (alloc.userGroupId && alloc.userGroupId === user.userGroupId) {
            const groupUsers = allCompanyUsers.filter(u => u.userGroupId === alloc.userGroupId);
            const totalSharesInGroup = groupUsers.reduce((sum, u) => sum + (u.shares || 0), 0);
            
            if (totalSharesInGroup > 0) {
                const userShareRatio = (user.shares || 0) / totalSharesInGroup;
                totalGallons += proportionalGallons * userShareRatio;
            }
            continue;
        }

        // 3. Allocation is company-wide (and not for a specific user or group)
        if (!alloc.userId && !alloc.userGroupId) {
            const totalSharesInCompany = allCompanyUsers.reduce((sum, u) => sum + (u.shares || 0), 0);

            if (totalSharesInCompany > 0) {
                const userShareRatio = (user.shares || 0) / totalSharesInCompany;
                totalGallons += proportionalGallons * userShareRatio;
            }
        }
    }
    return totalGallons;
};

// Labels for units
export const getUnitLabel = (unit: Unit): UnitLabel => {
    const UNIT_LABELS: Record<Unit, UnitLabel> = {
        'gallons': 'Gallons',
        'kgal': 'kGal',
        'acre-feet': 'Acre-Feet',
        'cubic-feet': 'Cubic Feet',
        'cfs': 'CFS',
        'gpm': 'GPM',
        'acre-feet-day': 'Ac-Ft/Day',
    };
    return UNIT_LABELS[unit];
}
export type UsageEntry = {
    id: string;
    userId: string;
    date: string; // YYYY-MM-DD
    usage: number; // in gallons
}


    
