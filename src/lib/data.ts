
// A mock data service to simulate database interactions.
// In a real application, this would be replaced with actual database calls (e.g., to Firestore).

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
    'cfs': 7.48052, // Cubic feet per second to gallons
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

export type UsageEntry = {
    id: string;
    userId: string;
    date: string; // YYYY-MM-DD
    usage: number; // Always in gallons
}


let companies: Company[] = [
  { id: '0', name: 'AquaWise HQ', defaultUnit: 'gallons', userGroupsEnabled: false },
  { id: '1', name: 'Golden Valley Agriculture', defaultUnit: 'gallons', userGroupsEnabled: true },
  { id: '2', name: 'Sunrise Farms', defaultUnit: 'acre-feet', userGroupsEnabled: false },
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
];

let usageData: UsageEntry[] = [];

// --- Generate extensive mock data for June and July 2025 ---
const generateMockUsage = () => {
    const generatedData: UsageEntry[] = [];
    let idCounter = 1;

    for (const alloc of allocations) {
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
        const dailyAllocation = alloc.gallons / 7;

        const startDate = new Date(alloc.startDate);
        const endDate = new Date(alloc.endDate);
        const currentDate = new Date(startDate);
        
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


// --- API Functions ---

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

// Function to simulate bulk adding/overwriting usage data
export const bulkAddUsageEntries = async (entries: Omit<UsageEntry, 'id'>[], mode: 'overwrite' | 'new_only', inputUnit: Unit): Promise<{ added: number, updated: number }> => {
  let added = 0;
  let updated = 0;

  const conversionToGallons = CONVERSION_FACTORS_TO_GALLONS.volume[inputUnit as keyof typeof CONVERSION_FACTORS_TO_GALLONS.volume] || 1;

  entries.forEach(newEntry => {
    const gallonsUsage = newEntry.usage * conversionToGallons;

    const existingIndex = usageData.findIndex(d => d.userId === newEntry.userId && d.date === newEntry.date);
    
    if (existingIndex !== -1) {
      if (mode === 'overwrite') {
        usageData[existingIndex] = { ...newEntry, usage: gallonsUsage, id: usageData[existingIndex].id };
        updated++;
      }
      // If mode is 'new_only' and it exists, we do nothing.
    } else {
      // If it doesn't exist, we add it regardless of the mode.
      usageData.push({ ...newEntry, usage: gallonsUsage, id: `u${Date.now()}${Math.random()}` });
      added++;
    }
  });
  
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
        allocations.filter(a => a.companyId === user.companyId && (!a.userId || a.userId === userId || (user.userGroupId && a.userGroupId === user.userGroupId)))
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
