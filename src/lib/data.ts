

// A mock data service to simulate database interactions.
// In a real application, this would be replaced with actual database calls (e.g., to Firestore).
import { differenceInDays, max, min, parseISO, format, startOfDay, subDays } from "date-fns";
import type { DateRange } from "react-day-picker";
import { sendThresholdAlertEmail, sendSpikeAlertEmail, sendWaterOrderStatusUpdateEmail, sendWaterOrderSubmissionEmail } from './actions';

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
    createdAt: string; // ISO 8601 format
    isRead: boolean;
    link?: string;
}

export type NotificationSettings = {
  allocationChangeAlerts: { enabled: boolean; message?: string; };
  thresholdAlerts: { enabled: boolean; thresholds: { percentage: number }[]; email: string; message?: string; };
  spikeAlerts: { enabled: boolean; percentage: number; email: string; message?: string; };
}

let MOCK_NOTIFICATION_SETTINGS: NotificationSettings = {
    allocationChangeAlerts: {
        enabled: true,
        message: "Hello {{userName}}, your water allocation has been {{updateType}}. The new period is from {{startDate}} to {{endDate}} with an amount of {{amount}} {{unit}}."
    },
    thresholdAlerts: {
        enabled: true,
        thresholds: [
            { percentage: 75 },
            { percentage: 90 },
            { percentage: 100 },
        ],
        email: 'billing@gva.com',
        message: "Hi {{userName}}, you have reached {{percentage}}% of your water allocation for the period. Current usage: {{usage}} of {{allocation}} {{unit}}."
    },
    spikeAlerts: {
        enabled: true,
        percentage: 50,
        email: 'ops@gva.com',
        message: "Hi {{userName}}, we've detected a usage spike. Your usage yesterday was {{usage}} {{unit}}, which is {{spikePercentage}}% higher than your weekly average."
    }
}


let companies: Company[] = [
  { id: '0', name: 'AquaWise HQ', defaultUnit: 'acre-feet', userGroupsEnabled: false, waterOrdersEnabled: true, notificationSettings: MOCK_NOTIFICATION_SETTINGS },
  { id: '1', name: 'Golden Valley Agriculture', defaultUnit: 'acre-feet', userGroupsEnabled: true, waterOrdersEnabled: false, notificationSettings: MOCK_NOTIFICATION_SETTINGS },
  { id: '2', name: 'Sunrise Farms', defaultUnit: 'acre-feet', userGroupsEnabled: false, waterOrdersEnabled: true, notificationSettings: MOCK_NOTIFICATION_SETTINGS },
  { id: '3', name: 'Pleasant View Orchards', defaultUnit: 'acre-feet', userGroupsEnabled: true, waterOrdersEnabled: true, notificationSettings: MOCK_NOTIFICATION_SETTINGS },
];

let userGroups: UserGroup[] = [
    { id: 'group1', name: 'Northern Fields', companyId: '1'},
    { id: 'group2', name: 'Southern Fields', companyId: '1'},
    { id: 'group3', name: 'Well 5', companyId: '1'},
];

let users: User[] = [
  // Super Admin
  { id: '100', name: 'Ryan Jolley', email: 'ryan@aquawise.com', role: 'Super Admin', companyId: '0', notificationPreference: 'email' },

  // Golden Valley Agriculture
  { id: '101', name: 'Alice Johnson', email: 'alice@gva.com', mobileNumber: '555-0101', role: 'Admin & Customer', companyId: '1', shares: 50, notificationPreference: 'email' },
  { id: '102', name: 'Bob Williams', email: 'bob@gva.com', mobileNumber: '555-0102', role: 'Customer', companyId: '1', shares: 10, notificationPreference: 'mobile', userGroupId: 'group1' },
  { id: '103', name: 'Charlie Brown', email: 'charlie@gva.com', mobileNumber: '555-0103', role: 'Customer', companyId: '1', shares: 15, notificationPreference: 'email', userGroupId: 'group1' },
  { id: '104', name: 'David Garcia', email: 'david@gva.com', mobileNumber: '555-0104', role: 'Customer', companyId: '1', shares: 11, notificationPreference: 'email', userGroupId: 'group2' },
  { id: '105', name: 'Emily Clark', email: 'emily@gva.com', role: 'Customer', companyId: '1', shares: 20, notificationPreference: 'email', userGroupId: 'group2' },
  { id: '106', name: 'Frank Miller', email: 'frank@gva.com', role: 'Customer', companyId: '1', shares: 5, notificationPreference: 'mobile', userGroupId: 'group3' },
  { id: '107', name: 'Grace Hall', email: 'grace@gva.com', role: 'Customer', companyId: '1', shares: 8, notificationPreference: 'email', userGroupId: 'group3' },

  // Sunrise Farms
  { id: '201', name: 'Diana Miller', email: 'diana@sunrise.com', mobileNumber: '555-0201', role: 'Admin', companyId: '2', notificationPreference: 'email' },
  { id: '202', name: 'Evan Davis', email: 'evan@sunrise.com', role: 'Customer', companyId: '2', shares: 12, notificationPreference: 'email' },
  { id: '203', name: 'Fiona White', email: 'fiona@sunrise.com', mobileNumber: '555-0203', role: 'Customer', companyId: '2', shares: 18, notificationPreference: 'mobile' },
  
  // Pleasant View Orchards
  { id: '301', name: 'George Harris', email: 'george@pvo.com', mobileNumber: '555-0301', role: 'Admin & Customer', companyId: '3', shares: 100, notificationPreference: 'email' },
  { id: '302', name: 'Hannah Martin', email: 'hannah@pvo.com', mobileNumber: '555-0302', role: 'Customer', companyId: '3', shares: 75, notificationPreference: 'email' },
  { id: '303', name: 'Ian Thompson', email: 'ian@pvo.com', mobileNumber: '555-0303', role: 'Customer', companyId: '3', shares: 85, notificationPreference: 'mobile' },
  { id: '304', name: 'Jane King', email: 'jane@pvo.com', mobileNumber: '555-0304', role: 'Customer', companyId: '3', shares: 90, notificationPreference: 'email' },
];

let allocations: Allocation[] = [
    // Weekly Allocations for June & July 2025 for GVA (companyId: '1')
    { id: 'alloc_gva_1', companyId: '1', startDate: '2025-06-01T00:00:00.000Z', endDate: '2025-06-07T23:59:59.000Z', gallons: 850000 },
    { id: 'alloc_gva_2', companyId: '1', startDate: '2025-06-08T00:00:00.000Z', endDate: '2025-06-14T23:59:59.000Z', gallons: 950000 },
    { id: 'alloc_gva_3', companyId: '1', startDate: '2025-06-15T00:00:00.000Z', endDate: '2025-06-21T23:59:59.000Z', gallons: 700000, userGroupId: 'group1' },
    { id: 'alloc_gva_4', companyId: '1', startDate: '2025-06-22T00:00:00.000Z', endDate: '2025-06-28T23:59:59.000Z', gallons: 1000000, userGroupId: 'group2' },
    { id: 'alloc_gva_5', companyId: '1', startDate: '2025-06-29T00:00:00.000Z', endDate: '2025-07-05T23:59:59.000Z', gallons: 650000, userId: '101' },
    { id: 'alloc_gva_6', companyId: '1', startDate: '2025-07-06T00:00:00.000Z', endDate: '2025-07-12T23:59:59.000Z', gallons: 750000 },
    { id: 'alloc_gva_7', companyId: '1', startDate: '2025-07-13T00:00:00.000Z', endDate: '2025-07-19T23:59:59.000Z', gallons: 900000 },
    { id: 'alloc_gva_8', companyId: '1', startDate: '2025-07-20T00:00:00.000Z', endDate: '2025-07-26T23:59:59.000Z', gallons: 600000 },
    { id: 'alloc_gva_9', companyId: '1', startDate: '2025-07-27T00:00:00.000Z', endDate: '2025-07-31T23:59:59.000Z', gallons: 800000 }, // Shorter week
    
    // Weekly Allocations for June & July 2025 for Sunrise Farms (companyId: '2')
    { id: 'alloc_sf_1', companyId: '2', startDate: '2025-06-01T00:00:00.000Z', endDate: '2025-06-07T23:59:59.000Z', gallons: 55000 },
    { id: 'alloc_sf_2', companyId: '2', startDate: '2025-06-08T00:00:00.000Z', endDate: '2025-06-14T23:59:59.000Z', gallons: 60000 },
    { id: 'alloc_sf_3', companyId: '2', startDate: '2025-06-15T00:00:00.000Z', endDate: '2025-06-21T23:59:59.000Z', gallons: 50000 },
    { id: 'alloc_sf_4', companyId: '2', startDate: '2025-06-22T00:00:00.000Z', endDate: '2025-06-28T23:59:59.000Z', gallons: 62000 },
    { id: 'alloc_sf_5', companyId: '2', startDate: '2025-06-29T00:00:00.000Z', endDate: '2025-07-05T23:59:59.000Z', gallons: 58000 },
    { id: 'alloc_sf_6', companyId: '2', startDate: '2025-07-06T00:00:00.000Z', endDate: '2025-07-12T23:59:59.000Z', gallons: 53000 },

    // Annual Allocations for Pleasant View Orchards (companyId: '3')
    { id: 'alloc_pvo_301', companyId: '3', userId: '301', startDate: '2025-01-01T00:00:00.000Z', endDate: '2025-12-31T23:59:59.000Z', gallons: 25 * CONVERSION_FACTORS_TO_GALLONS.volume['acre-feet'] },
    { id: 'alloc_pvo_302', companyId: '3', userId: '302', startDate: '2025-01-01T00:00:00.000Z', endDate: '2025-12-31T23:59:59.000Z', gallons: 22 * CONVERSION_FACTORS_TO_GALLONS.volume['acre-feet'] },
    { id: 'alloc_pvo_303', companyId: '3', userId: '303', startDate: '2025-01-01T00:00:00.000Z', endDate: '2025-12-31T23:59:59.000Z', gallons: 28 * CONVERSION_FACTORS_TO_GALLONS.volume['acre-feet'] },
    { id: 'alloc_pvo_304', companyId: '3', userId: '304', startDate: '2025-01-01T00:00:00.000Z', endDate: '2025-12-31T23:59:59.000Z', gallons: 30 * CONVERSION_FACTORS_TO_GALLONS.volume['acre-feet'] },
];

const GALLONS_PER_ACRE_FOOT_DAY = CONVERSION_FACTORS_TO_GALLONS.rate['acre-feet-day'];

let waterAvailabilities: WaterAvailability[] = [
    { id: 'avail_gva_1', companyId: '1', startDate: '2025-04-15T00:00:00.000Z', endDate: '2025-09-30T23:59:59.000Z', gallons: (differenceInDays(new Date('2025-09-30'), new Date('2025-04-15')) + 1) * 2 * GALLONS_PER_ACRE_FOOT_DAY },
    { id: 'avail_sf_1', companyId: '2', startDate: '2025-06-01T00:00:00.000Z', endDate: '2025-07-31T23:59:59.000Z', gallons: 1000000 },
    // 184 days (April 1 to Oct 1) * 2 ac-ft/day
    { id: 'avail_pvo_1', companyId: '3', startDate: '2025-04-01T00:00:00.000Z', endDate: '2025-10-01T23:59:59.000Z', gallons: (differenceInDays(new Date('2025-10-01'), new Date('2025-04-01'))+1) * 2 * GALLONS_PER_ACRE_FOOT_DAY },
];

let waterOrders: WaterOrder[] = [
    { 
        id: 'wo_1', 
        userId: '102', 
        companyId: '1', 
        startDate: '2025-07-10T08:00:00.000Z', 
        endDate: '2025-07-10T16:00:00.000Z', 
        amount: 3, 
        unit: 'cfs', 
        totalGallons: 8617555.2,
        status: 'pending', 
        createdAt: new Date().toISOString() 
    },
    { 
        id: 'wo_2', 
        userId: '103', 
        companyId: '1', 
        startDate: '2025-07-11T10:00:00.000Z', 
        endDate: '2025-07-11T14:00:00.000Z', 
        amount: 500, 
        unit: 'gpm', 
        totalGallons: 120000,
        status: 'approved', 
        createdAt: new Date().toISOString(),
        reviewedBy: '101',
        reviewedAt: new Date().toISOString(),
    },
     { 
        id: 'wo_3', 
        userId: '202', 
        companyId: '2', 
        startDate: '2025-07-12T09:00:00.000Z', 
        endDate: '2025-07-12T17:00:00.000Z', 
        amount: 2, 
        unit: 'cfs', 
        totalGallons: 5745036.8,
        status: 'completed', 
        createdAt: new Date().toISOString(),
        reviewedBy: '201',
        reviewedAt: new Date().toISOString(),
    },
    {
        id: 'wo_4',
        userId: '102',
        companyId: '1',
        startDate: '2025-07-15T08:00:00.000Z',
        endDate: '2025-07-15T12:00:00.000Z',
        amount: 2,
        unit: 'cfs',
        totalGallons: 5745036.8,
        status: 'rejected',
        createdAt: '2025-07-13T10:00:00.000Z',
        reviewedBy: '101',
        reviewedAt: '2025-07-13T11:00:00.000Z',
        adminNotes: 'Canal maintenance scheduled during this time. Please reschedule for after the 18th.'
    },
    // --- Pleasant View Orchards - Completed Water Orders for Full Year ---
    // George Harris (301) - 4 orders
    { id: 'wo_pvo_301_1', userId: '301', companyId: '3', startDate: '2025-03-10T06:00:00.000Z', endDate: '2025-03-12T06:00:00.000Z', amount: 5, unit: 'acre-feet', totalGallons: 5 * 325851, status: 'completed', createdAt: '2025-03-09T10:00:00.000Z', reviewedBy: '301', reviewedAt: '2025-03-09T11:00:00.000Z' },
    { id: 'wo_pvo_301_2', userId: '301', companyId: '3', startDate: '2025-05-15T06:00:00.000Z', endDate: '2025-05-18T06:00:00.000Z', amount: 8, unit: 'acre-feet', totalGallons: 8 * 325851, status: 'completed', createdAt: '2025-05-14T10:00:00.000Z', reviewedBy: '301', reviewedAt: '2025-05-14T11:00:00.000Z' },
    { id: 'wo_pvo_301_3', userId: '301', companyId: '3', startDate: '2025-07-20T06:00:00.000Z', endDate: '2025-07-25T18:00:00.000Z', amount: 8, unit: 'acre-feet', totalGallons: 8 * 325851, status: 'completed', createdAt: '2025-07-19T10:00:00.000Z', reviewedBy: '301', reviewedAt: '2025-07-19T11:00:00.000Z' },
    { id: 'wo_pvo_301_4', userId: '301', companyId: '3', startDate: '2025-09-01T06:00:00.000Z', endDate: '2025-09-05T06:00:00.000Z', amount: 4, unit: 'acre-feet', totalGallons: 4 * 325851, status: 'completed', createdAt: '2025-08-31T10:00:00.000Z', reviewedBy: '301', reviewedAt: '2025-08-31T11:00:00.000Z' },
    
    // Hannah Martin (302) - 3 orders
    { id: 'wo_pvo_302_1', userId: '302', companyId: '3', startDate: '2025-04-05T08:00:00.000Z', endDate: '2025-04-10T08:00:00.000Z', amount: 10, unit: 'acre-feet', totalGallons: 10 * 325851, status: 'completed', createdAt: '2025-04-04T10:00:00.000Z', reviewedBy: '301', reviewedAt: '2025-04-04T11:00:00.000Z' },
    { id: 'wo_pvo_302_2', userId: '302', companyId: '3', startDate: '2025-06-10T08:00:00.000Z', endDate: '2025-06-15T08:00:00.000Z', amount: 7, unit: 'acre-feet', totalGallons: 7 * 325851, status: 'completed', createdAt: '2025-06-09T10:00:00.000Z', reviewedBy: '301', reviewedAt: '2025-06-09T11:00:00.000Z' },
    { id: 'wo_pvo_302_3', userId: '302', companyId: '3', startDate: '2025-08-15T08:00:00.000Z', endDate: '2025-08-18T08:00:00.000Z', amount: 5, unit: 'acre-feet', totalGallons: 5 * 325851, status: 'completed', createdAt: '2025-08-14T10:00:00.000Z', reviewedBy: '301', reviewedAt: '2025-08-14T11:00:00.000Z' },
    
    // Ian Thompson (303) - 5 orders
    { id: 'wo_pvo_303_1', userId: '303', companyId: '3', startDate: '2025-02-20T09:00:00.000Z', endDate: '2025-02-23T09:00:00.000Z', amount: 4, unit: 'acre-feet', totalGallons: 4 * 325851, status: 'completed', createdAt: '2025-02-19T10:00:00.000Z', reviewedBy: '301', reviewedAt: '2025-02-19T11:00:00.000Z' },
    { id: 'wo_pvo_303_2', userId: '303', companyId: '3', startDate: '2025-04-20T09:00:00.000Z', endDate: '2025-04-25T09:00:00.000Z', amount: 6, unit: 'acre-feet', totalGallons: 6 * 325851, status: 'completed', createdAt: '2025-04-19T10:00:00.000Z', reviewedBy: '301', reviewedAt: '2025-04-19T11:00:00.000Z' },
    { id: 'wo_pvo_303_3', userId: '303', companyId: '3', startDate: '2025-06-25T09:00:00.000Z', endDate: '2025-06-30T09:00:00.000Z', amount: 8, unit: 'acre-feet', totalGallons: 8 * 325851, status: 'completed', createdAt: '2025-06-24T10:00:00.000Z', reviewedBy: '301', reviewedAt: '2025-06-24T11:00:00.000Z' },
    { id: 'wo_pvo_303_4', userId: '303', companyId: '3', startDate: '2025-08-28T09:00:00.000Z', endDate: '2025-09-02T09:00:00.000Z', amount: 7, unit: 'acre-feet', totalGallons: 7 * 325851, status: 'completed', createdAt: '2025-08-27T10:00:00.000Z', reviewedBy: '301', reviewedAt: '2025-08-27T11:00:00.000Z' },
    { id: 'wo_pvo_303_5', userId: '303', companyId: '3', startDate: '2025-10-10T09:00:00.000Z', endDate: '2025-10-12T09:00:00.000Z', amount: 3, unit: 'acre-feet', totalGallons: 3 * 325851, status: 'completed', createdAt: '2025-10-09T10:00:00.000Z', reviewedBy: '301', reviewedAt: '2025-10-09T11:00:00.000Z' },

    // Jane King (304) - 4 orders
    { id: 'wo_pvo_304_1', userId: '304', companyId: '3', startDate: '2025-03-15T07:00:00.000Z', endDate: '2025-03-20T07:00:00.000Z', amount: 9, unit: 'acre-feet', totalGallons: 9 * 325851, status: 'completed', createdAt: '2025-03-14T10:00:00.000Z', reviewedBy: '301', reviewedAt: '2025-03-14T11:00:00.000Z' },
    { id: 'wo_pvo_304_2', userId: '304', companyId: '3', startDate: '2025-05-20T07:00:00.000Z', endDate: '2025-05-25T07:00:00.000Z', amount: 9, unit: 'acre-feet', totalGallons: 9 * 325851, status: 'completed', createdAt: '2025-05-19T10:00:00.000Z', reviewedBy: '301', reviewedAt: '2025-05-19T11:00:00.000Z' },
    { id: 'wo_pvo_304_3', userId: '304', companyId: '3', startDate: '2025-07-25T07:00:00.000Z', endDate: '2025-07-30T07:00:00.000Z', amount: 8, unit: 'acre-feet', totalGallons: 8 * 325851, status: 'completed', createdAt: '2025-07-24T10:00:00.000Z', reviewedBy: '301', reviewedAt: '2025-07-24T11:00:00.000Z' },
    { id: 'wo_pvo_304_4', userId: '304', companyId: '3', startDate: '2025-09-15T07:00:00.000Z', endDate: '2025-09-18T07:00:00.000Z', amount: 4, unit: 'acre-feet', totalGallons: 4 * 325851, status: 'completed', createdAt: '2025-09-14T10:00:00.000Z', reviewedBy: '301', reviewedAt: '2025-09-14T11:00:00.000Z' },
];

let usageData: UsageEntry[] = [];
let notifications: Notification[] = [];

// --- Generate extensive mock data for June and July 2025 ---
const generateMockUsage = () => {
    const generatedData: UsageEntry[] = [];
    let idCounter = 1;

    // Generate from periodic allocations
    for (const alloc of allocations) {
        if(alloc.companyId === '3') continue; // Skip PVO, their usage is from water orders

        let relevantUsers: User[];
        if (alloc.userId) {
            relevantUsers = users.filter(u => u.id === alloc.userId);
        } else if (alloc.userGroupId) {
            relevantUsers = users.filter(u => u.userGroupId === alloc.userGroupId);
        } else {
            relevantUsers = users.filter(u => u.companyId === alloc.companyId && u.role.includes('Customer'));
        }
        
        if (relevantUsers.length === 0) continue;

        const totalShares = relevantUsers.reduce((sum, u) => sum + (u.shares || 1), 0);
        const allocDurationDays = differenceInDays(parseISO(alloc.endDate), parseISO(alloc.startDate)) + 1;
        const dailyAllocation = alloc.gallons / allocDurationDays;

        const currentDate = new Date(alloc.startDate);
        const endDate = new Date(alloc.endDate);
        
        while(currentDate <= endDate) {
            for (const user of relevantUsers) {
                const userShareRatio = (user.shares || 1) / totalShares;
                // Base usage is proportional to their share, with some randomness
                const baseDailyUsage = dailyAllocation * userShareRatio;
                // Add +/- 20% randomness
                const randomFactor = 0.8 + Math.random() * 0.4;
                const finalUsage = Math.round(baseDailyUsage * randomFactor);

                generatedData.push({
                    id: `gen_u${idCounter++}`,
                    userId: user.id,
                    date: currentDate.toISOString().split('T')[0], // YYYY-MM-DD
                    usage: finalUsage,
                });
            }
             currentDate.setDate(currentDate.getDate() + 1);
        }
    }
    
    // Generate from completed water orders
    for (const order of waterOrders) {
        if(order.status !== 'completed') continue;
        
        const startDate = parseISO(order.startDate);
        const endDate = parseISO(order.endDate);
        // Add 1 to include the end day fully in the calculation
        const totalDays = (differenceInDays(endDate, startDate) || 0) + 1;
        const dailyGallons = order.totalGallons / totalDays;
        
        let currentDate = new Date(startDate);
        while(currentDate <= endDate) {
             generatedData.push({
                id: `gen_wo_${order.id}_${idCounter++}`,
                userId: order.userId,
                date: currentDate.toISOString().split('T')[0],
                usage: dailyGallons
            });
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }


    return generatedData;
}
usageData = generateMockUsage();


// Helper to get recent dates for default view
const getRecentDate = (daysAgo: number): string => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

// Add a few very recent entries for the default user to ensure dashboard has data on first load
usageData.push(
  { id: 'u1', userId: '101', date: getRecentDate(2), usage: 4500 },
  { id: 'u2', userId: '101', date: getRecentDate(1), usage: 5200 },
);

// Add some notifications
notifications.push(
    { id: 'n1', userId: '102', message: 'Your water order was approved.', createdAt: new Date().toISOString(), isRead: false },
    { id: 'n2', userId: '102', message: 'Your water order was rejected: Canal Maintenance.', createdAt: new Date(Date.now() - 86400000).toISOString(), isRead: true }
);


// --- API Functions ---

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


// Simulate async calls with Promise.resolve()
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


export const getCompanies = async (): Promise<Company[]> => {
  return Promise.resolve(companies.filter(c => c.id !== '0')); // Exclude HQ company from management list
};

export const getCompanyById = async (companyId: string): Promise<Company | undefined> => {
  return Promise.resolve(companies.find(c => c.id === companyId));
};

export const updateCompany = async (updatedCompany: Company): Promise<Company> => {
    const index = companies.findIndex(c => c.id === updatedCompany.id);
    if (index === -1) throw new Error("Company not found");
    companies[index] = updatedCompany;
    // In a real app, you might want to dispatch an event to update contexts
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('company-updated', { detail: updatedCompany }));
    }
    return Promise.resolve(updatedCompany);
}

// --- User Group Functions
export const getGroupsByCompany = async (companyId: string): Promise<UserGroup[]> => {
    return Promise.resolve(userGroups.filter(g => g.companyId === companyId));
};
export const addGroup = async (groupData: Omit<UserGroup, 'id'>): Promise<UserGroup> => {
    const newGroup: UserGroup = { ...groupData, id: `g${Date.now()}` };
    userGroups.push(newGroup);
    return Promise.resolve(newGroup);
};
export const updateGroup = async (updatedGroup: UserGroup): Promise<UserGroup> => {
    const index = userGroups.findIndex(g => g.id === updatedGroup.id);
    if (index === -1) throw new Error("Group not found");
    userGroups[index] = updatedGroup;
    return Promise.resolve(updatedGroup);
};
export const deleteGroup = async (groupId: string): Promise<void> => {
    userGroups = userGroups.filter(g => g.id !== groupId);
    // Also unassign users from this group
    users.forEach(u => {
        if (u.userGroupId === groupId) {
            u.userGroupId = undefined;
        }
    });
    return Promise.resolve();
};



export const getUsersByCompany = async (companyId: string): Promise<User[]> => {
  return Promise.resolve(users.filter(u => u.companyId === companyId));
};

export const getUserById = async (userId: string): Promise<User | undefined> => {
    return Promise.resolve(users.find(u => u.id === userId));
};

export const addUser = async (userData: Omit<User, 'id' | 'role'> & { role: 'Admin' | 'Customer' | 'Admin & Customer' }): Promise<User> => {
    const newUser: User = { ...userData, id: `u${Date.now()}` };
    users.push(newUser);
    return Promise.resolve(newUser);
};

export const updateUser = async (updatedUser: User): Promise<User> => {
    const index = users.findIndex(u => u.id === updatedUser.id);
    if (index === -1) throw new Error("User not found");
    users[index] = updatedUser;
    // This is a bit of a hack to force a re-render in the AuthContext
    // In a real app with a proper state management library, this would be handled differently.
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('user-updated', { detail: updatedUser }));
    }
    return Promise.resolve(updatedUser);
};

export const deleteUser = async (userId: string): Promise<void> => {
    users = users.filter(u => u.id !== userId);
    // Also remove their usage data
    usageData = usageData.filter(d => d.userId !== userId);
    return Promise.resolve();
};

export const getUsageForUser = async (userId: string, startDate?: string, endDate?: string): Promise<UsageEntry[]> => {
  let userUsage = usageData.filter(u => u.userId === userId);
  
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  if (start) {
    userUsage = userUsage.filter(u => new Date(u.date) >= start);
  }
  if (end) {
    userUsage = userUsage.filter(u => new Date(u.date) <= end);
  }
  return Promise.resolve(userUsage.sort((a, b) => a.date.localeCompare(b.date)));
};

export type UsageEntry = {
    id: string;
    userId: string;
    date: string; // YYYY-MM-DD
    usage: number; // in gallons
}


// Function to simulate bulk adding/overwriting usage data
export const bulkAddUsageEntries = async (entries: Omit<UsageEntry, 'id'>[], mode: 'overwrite' | 'new_only' | 'add' = 'overwrite', inputUnit: Unit = 'gallons'): Promise<{ added: number, updated: number }> => {
  let added = 0;
  let updated = 0;

  const conversionToGallons = CONVERSION_FACTORS_TO_GALLONS.volume[inputUnit as keyof typeof CONVERSION_FACTORS_TO_GALLONS.volume] || 1;

  for (const newEntry of entries) {
    const gallonsUsage = newEntry.usage * conversionToGallons;

    const existingIndex = usageData.findIndex(d => d.userId === newEntry.userId && d.date === newEntry.date);
    
    if (existingIndex !== -1) {
      if (mode === 'overwrite') {
        usageData[existingIndex].usage = gallonsUsage;
        updated++;
      } else if (mode === 'add') {
        usageData[existingIndex].usage += gallonsUsage;
        updated++;
      }
      // If mode is 'new_only' and it exists, we do nothing.
    } else {
      // If it doesn't exist, we add it regardless of the mode.
      usageData.push({ ...newEntry, usage: gallonsUsage, id: `u${Date.now()}${Math.random()}` });
      added++;
    }
     // After any change, check for alerts
    await checkAndTriggerAlerts(newEntry.userId, newEntry.date);
  }
  
  return Promise.resolve({ added, updated });
};

// To support our mock implementation of checking for duplicates before upload.
export const findExistingUsageForUsersAndDates = async (entriesToCheck: { userId: string, date: string }[]): Promise<string[]> => {
    const existingKeys = new Set(usageData.map(entry => `${entry.userId}-${entry.date}`));
    const duplicates = entriesToCheck
        .filter(entry => existingKeys.has(`${entry.userId}-${entry.date}`))
        .map(entry => `${entry.userId}-${entry.date}`);
    return Promise.resolve(duplicates);
};

// --- Allocation Functions ---
export const getAllocationsByCompany = async (companyId: string): Promise<Allocation[]> => {
    return Promise.resolve(allocations.filter(a => a.companyId === companyId));
};

export const getAllocationsForUser = async (userId: string): Promise<Allocation[]> => {
    const user = await getUserById(userId);
    if (!user) return [];
    
    // Return allocations that are company-wide (no userId) or specific to this user or their group
    return Promise.resolve(
        allocations.filter(a => a.companyId === user.companyId)
    );
};

export const addAllocation = async (allocation: Omit<Allocation, 'id'>): Promise<Allocation> => {
    const newAllocation: Allocation = { ...allocation, id: `a${Date.now()}` };
    allocations.push(newAllocation);
    return Promise.resolve(newAllocation);
};

export const updateAllocation = async (updatedAllocation: Allocation): Promise<Allocation> => {
    const index = allocations.findIndex(a => a.id === updatedAllocation.id);
    if (index === -1) throw new Error("Allocation not found");
    allocations[index] = updatedAllocation;
    return Promise.resolve(updatedAllocation);
};

export const deleteAllocation = async (allocationId: string): Promise<void> => {
    allocations = allocations.filter(a => a.id !== allocationId);
    return Promise.resolve();
};


// --- Water Availability Functions ---
export const getWaterAvailabilities = async (companyId: string): Promise<WaterAvailability[]> => {
    return Promise.resolve(waterAvailabilities.filter(a => a.companyId === companyId));
};

export const addWaterAvailability = async (availability: Omit<WaterAvailability, 'id'>): Promise<WaterAvailability> => {
    const newAvailability: WaterAvailability = { ...availability, id: `avail${Date.now()}` };
    waterAvailabilities.push(newAvailability);
    return Promise.resolve(newAvailability);
};

export const updateWaterAvailability = async (updatedAvailability: WaterAvailability): Promise<WaterAvailability> => {
    const index = waterAvailabilities.findIndex(a => a.id === updatedAvailability.id);
    if (index === -1) throw new Error("Availability not found");
    waterAvailabilities[index] = updatedAvailability;
    return Promise.resolve(updatedAvailability);
};

export const deleteWaterAvailability = async (availabilityId: string): Promise<void> => {
    waterAvailabilities = waterAvailabilities.filter(a => a.id !== availabilityId);
    return Promise.resolve();
};

// --- Water Order Functions ---
export const getWaterOrdersByCompany = async (companyId: string): Promise<WaterOrder[]> => {
    return Promise.resolve(waterOrders.filter(wo => wo.companyId === companyId));
}

export const getWaterOrdersForUser = async (userId: string): Promise<WaterOrder[]> => {
    return Promise.resolve(waterOrders.filter(wo => wo.userId === userId));
}

export const addWaterOrder = async (orderData: Omit<WaterOrder, 'id' | 'status' | 'createdAt'>): Promise<WaterOrder> => {
    const newOrder: WaterOrder = {
        ...orderData,
        id: `wo_${Date.now()}`,
        status: 'pending',
        createdAt: new Date().toISOString(),
    };
    waterOrders.push(newOrder);

    // Create notification for admin
    const companyAdmins = await getUsersByCompany(orderData.companyId);
    const admins = companyAdmins.filter(u => u.role.includes('Admin'));
    const user = await getUserById(orderData.userId);

    if (user) {
        await sendWaterOrderSubmissionEmail(newOrder, user, admins);
        for (const admin of admins) {
            addNotification({
                userId: admin.id,
                message: `New water order submitted by ${user.name}.`,
            });
        }
    }

    return Promise.resolve(newOrder);
}

export const updateWaterOrderStatus = async (orderId: string, status: 'approved' | 'rejected' | 'completed', adminUserId: string, notes?: string): Promise<WaterOrder> => {
    const index = waterOrders.findIndex(wo => wo.id === orderId);
    if (index === -1) throw new Error("Water order not found");
    
    const originalStatus = waterOrders[index].status;
    waterOrders[index] = {
        ...waterOrders[index],
        status,
        reviewedBy: adminUserId,
        reviewedAt: new Date().toISOString(),
        adminNotes: notes,
    };
    
    const order = waterOrders[index];
    
    // Create notification and email for user if status changed
    if (originalStatus !== status) {
        const user = await getUserById(order.userId);
        if (user) {
            await sendWaterOrderStatusUpdateEmail(order, user);
        }
        
        let message = `Your water order has been ${status}.`;
        if (status === 'rejected' && notes) {
            message = `Your water order was rejected: ${notes}`;
        } else if (status === 'completed') {
            message = `Your water order has been marked as completed and the usage has been added to your dashboard.`
        }

        addNotification({
            userId: order.userId,
            message: message,
        });
    }

    // If completed, record the usage and check for alerts
    if (status === 'completed') {
        const entries: Omit<UsageEntry, 'id'>[] = [];
        const startDate = parseISO(order.startDate);
        const endDate = parseISO(order.endDate);
        const totalDays = (differenceInDays(endDate, startDate) || 0) + 1;
        const dailyGallons = order.totalGallons / totalDays;
        
        let currentDate = new Date(startDate);
        while(currentDate <= endDate) {
            const entry = {
                userId: order.userId,
                date: currentDate.toISOString().split('T')[0],
                usage: dailyGallons
            };
            entries.push(entry);
            currentDate.setDate(currentDate.getDate() + 1);
        }
        // Use bulkAddUsageEntries to actually add the data
        const { added, updated } = await bulkAddUsageEntries(entries, 'add');
        
        // After bulk adding, re-check alerts for each day to ensure accuracy with the new totals
        currentDate = new Date(startDate);
        while(currentDate <= endDate) {
            await checkAndTriggerAlerts(order.userId, format(currentDate, 'yyyy-MM-dd'));
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }

    return Promise.resolve(waterOrders[index]);
}

export const checkOrderAvailability = async (companyId: string, startDate: string, endDate: string, totalGallons: number): Promise<boolean> => {
    const avails = await getWaterAvailabilities(companyId);
    const orders = await getWaterOrdersByCompany(companyId);

    const start = startOfDay(parseISO(startDate));
    const end = startOfDay(parseISO(endDate));
    let isAvailable = true;

    for (let day = start; day <= end; day.setDate(day.getDate() + 1)) {
        const dayKey = format(day, 'yyyy-MM-dd');
        
        const dayAvailability = avails.reduce((total, avail) => {
            const availStart = startOfDay(parseISO(avail.startDate));
            const availEnd = startOfDay(parseISO(avail.endDate));
            if (day >= availStart && day <= availEnd) {
                const durationDays = differenceInDays(availEnd, availStart) + 1;
                return total + (avail.gallons / durationDays);
            }
            return total;
        }, 0);

        const approvedDemand = orders.filter(o => o.status === 'approved' || o.status === 'completed').reduce((total, order) => {
            const orderStart = startOfDay(parseISO(order.startDate));
            const orderEnd = startOfDay(parseISO(order.endDate));
            if (day >= orderStart && day <= orderEnd) {
                const durationDays = differenceInDays(orderEnd, orderStart) + 1;
                return total + (order.totalGallons / durationDays);
            }
            return total;
        }, 0);
        
        const durationDays = differenceInDays(end, start) + 1;
        const requestedDailyAmount = totalGallons / durationDays;

        if ((approvedDemand + requestedDailyAmount) > dayAvailability) {
            isAvailable = false;
            break;
        }
    }
    return Promise.resolve(isAvailable);
}

// --- Notification Functions ---
export const getNotificationsForUser = async (userId: string): Promise<Notification[]> => {
    return Promise.resolve(notifications.filter(n => n.userId === userId).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
}

export const addNotification = (data: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Notification => {
    const newNotification: Notification = {
        ...data,
        id: `n_${Date.now()}_${Math.random()}`,
        createdAt: new Date().toISOString(),
        isRead: false,
    };
    notifications.unshift(newNotification);

    // Dispatch event to notify UI components
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('notifications-updated'));
    }

    return newNotification;
}

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
    const index = notifications.findIndex(n => n.id === notificationId);
    if(index > -1) {
        notifications[index].isRead = true;
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('notifications-updated'));
        }
    }
    return Promise.resolve();
}

export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
    notifications.forEach(n => {
        if (n.userId === userId) {
            n.isRead = true;
        }
    });
     if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('notifications-updated'));
    }
    return Promise.resolve();
};

// --- Alerting Logic ---

// Store which threshold alerts have been sent to avoid spamming
// Key: `${userId}-${allocationId}-${percentage}`
const sentThresholdAlerts = new Set<string>();

const checkAndTriggerAlerts = async (userId: string, date: string) => {
    const user = await getUserById(userId);
    if (!user) return;
    const company = await getCompanyById(user.companyId);
    if (!company?.notificationSettings) return;

    const { thresholdAlerts, spikeAlerts } = company.notificationSettings;

    // 1. Check Threshold Alerts
    if (thresholdAlerts.enabled) {
        const userAllocations = await getAllocationsForUser(userId);
        const allCompanyUsers = await getUsersByCompany(user.companyId);
        
        const relevantAllocation = userAllocations.find(a => 
            date >= a.startDate && date <= a.endDate
        );

        if (relevantAllocation) {
            const allocationForPeriod = calculateUserAllocation(user, allCompanyUsers, [relevantAllocation], { from: parseISO(relevantAllocation.startDate), to: parseISO(relevantAllocation.endDate) });
            const usageInPeriod = (await getUsageForUser(userId, relevantAllocation.startDate, relevantAllocation.endDate)).reduce((sum, entry) => sum + entry.usage, 0);
            
            const currentPercentage = allocationForPeriod > 0 ? (usageInPeriod / allocationForPeriod) * 100 : 0;
            
            for (const threshold of thresholdAlerts.thresholds) {
                const alertKey = `${userId}-${relevantAllocation.id}-${threshold.percentage}`;
                if (currentPercentage >= threshold.percentage && !sentThresholdAlerts.has(alertKey)) {
                    await sendThresholdAlertEmail(user, company, usageInPeriod, allocationForPeriod, threshold.percentage);
                    addNotification({ userId, message: `You have reached ${threshold.percentage}% of your water allocation.` });
                    sentThresholdAlerts.add(alertKey);
                }
            }
        }
    }

    // 2. Check Spike Alerts
    if (spikeAlerts.enabled) {
        const today = parseISO(date);
        const sevenDaysAgo = format(subDays(today, 7), 'yyyy-MM-dd');
        const yesterday = format(subDays(today, 1), 'yyyy-MM-dd');
        
        const last7DaysUsage = await getUsageForUser(userId, sevenDaysAgo, yesterday);
        if (last7DaysUsage.length > 1) { // Need at least 2 days of data to compare
            const total = last7DaysUsage.reduce((sum, u) => sum + u.usage, 0);
            const average = total / last7DaysUsage.length;
            const todaysUsage = (await getUsageForUser(userId, date, date))[0]?.usage || 0;

            const spikePercentage = average > 0 ? ((todaysUsage - average) / average) * 100 : 0;
            if (spikePercentage > spikeAlerts.percentage) {
                await sendSpikeAlertEmail(user, company, todaysUsage, average);
                 addNotification({ userId, message: `High usage spike of ${Math.round(spikePercentage)}% detected.` });
            }
        }
    }
};

export const checkAllUsersForAlerts = async (userIds: string[], date: string) => {
    for (const userId of userIds) {
        await checkAndTriggerAlerts(userId, date);
    }
}
