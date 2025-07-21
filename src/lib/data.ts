
// A mock data service to simulate database interactions.
// In a real application, this would be replaced with actual database calls (e.g., to Firestore).

export type Company = {
  id: string;
  name: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Customer';
  companyId: string;
  shares?: number;
};

export type UsageEntry = {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD format
  usage: number; // in gallons
};

export type Allocation = {
    id: string;
    companyId: string;
    startDate: string; // ISO 8601 format
    endDate: string; // ISO 8601 format
    gallons: number;
    userId?: string; // If undefined, applies to all users in the company
};


const companies: Company[] = [
  { id: '1', name: 'Golden Valley Agriculture' },
  { id: '2', name: 'Sunrise Farms' },
];

let users: User[] = [
  // Golden Valley Agriculture
  { id: '101', name: 'Alice Johnson', email: 'alice@gva.com', role: 'Admin', companyId: '1', shares: 50 },
  { id: '102', name: 'Bob Williams', email: 'bob@gva.com', role: 'Customer', companyId: '1', shares: 10 },
  { id: '103', name: 'Charlie Brown', email: 'charlie@gva.com', role: 'Customer', companyId: '1', shares: 15 },
  { id: '104', name: 'David Garcia', email: 'david@gva.com', role: 'Customer', companyId: '1', shares: 11 },
  { id: '105', name: 'Emily Clark', email: 'emily@gva.com', role: 'Customer', companyId: '1', shares: 20 },
  { id: '106', name: 'Frank Miller', email: 'frank@gva.com', role: 'Customer', companyId: '1', shares: 5 },
  { id: '107', name: 'Grace Hall', email: 'grace@gva.com', role: 'Customer', companyId: '1', shares: 8 },

  // Sunrise Farms
  { id: '201', name: 'Diana Miller', email: 'diana@sunrise.com', role: 'Admin', companyId: '2', shares: 30 },
  { id: '202', name: 'Evan Davis', email: 'evan@sunrise.com', role: 'Customer', companyId: '2', shares: 12 },
  { id: '203', name: 'Fiona White', email: 'fiona@sunrise.com', role: 'Customer', companyId: '2', shares: 18 },
];

// Helper to get dates for the last week
const getRecentDate = (daysAgo: number): string => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

const getRecentDateTime = (daysAgo: number, hour = 0, minute = 0) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    date.setHours(hour, minute, 0, 0);
    return date.toISOString();
}

let usageData: UsageEntry[] = [
  // A couple of recent entries for the default user to ensure dashboard has data on load
  { id: 'u1', userId: '101', date: getRecentDate(2), usage: 4500 },
  { id: 'u2', userId: '101', date: getRecentDate(1), usage: 5200 },
];

// --- Generate extensive mock data for June and July 2025 ---
const generateMockUsage = () => {
    const allUserIds = users.map(u => u.id);
    const startDate = new Date('2025-06-01');
    const endDate = new Date('2025-07-31');

    const generatedData: UsageEntry[] = [];
    let currentDate = new Date(startDate);
    let idCounter = usageData.length + 1;

    while (currentDate <= endDate) {
        for (const userId of allUserIds) {
            // Generate random usage between 8000 and 10000 gallons for customers
            // And between 4000 and 6000 for admins to simulate different patterns
            const user = users.find(u => u.id === userId);
            const baseUsage = user?.role === 'Admin' ? 6400 : 12800; // Increased by 60%
            const randomComponent = 3200; // Increased by 60%
            const dailyUsage = Math.floor(Math.random() * randomComponent) + baseUsage;
            
            generatedData.push({
                id: `gen_u${idCounter++}`,
                userId: userId,
                date: currentDate.toISOString().split('T')[0], // YYYY-MM-DD
                usage: dailyUsage,
            });
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return generatedData;
}
usageData.push(...generateMockUsage());
// --- End of data generation ---


let allocations: Allocation[] = [
    // Weekly Allocations for June & July 2025 for GVA (companyId: '1')
    { id: 'alloc_25_w1', companyId: '1', startDate: '2025-06-01T00:00:00.000Z', endDate: '2025-06-07T23:59:59.000Z', gallons: 85000 },
    { id: 'alloc_25_w2', companyId: '1', startDate: '2025-06-08T00:00:00.000Z', endDate: '2025-06-14T23:59:59.000Z', gallons: 95000 },
    { id: 'alloc_25_w3', companyId: '1', startDate: '2025-06-15T00:00:00.000Z', endDate: '2025-06-21T23:59:59.000Z', gallons: 70000 },
    { id: 'alloc_25_w4', companyId: '1', startDate: '2025-06-22T00:00:00.000Z', endDate: '2025-06-28T23:59:59.000Z', gallons: 100000 },
    { id: 'alloc_25_w5', companyId: '1', startDate: '2025-06-29T00:00:00.000Z', endDate: '2025-07-05T23:59:59.000Z', gallons: 65000 },
    { id: 'alloc_25_w6', companyId: '1', startDate: '2025-07-06T00:00:00.000Z', endDate: '2025-07-12T23:59:59.000Z', gallons: 75000 },
    { id: 'alloc_25_w7', companyId: '1', startDate: '2025-07-13T00:00:00.000Z', endDate: '2025-07-19T23:59:59.000Z', gallons: 90000 },
    { id: 'alloc_25_w8', companyId: '1', startDate: '2025-07-20T00:00:00.000Z', endDate: '2025-07-26T23:59:59.000Z', gallons: 60000 },
    { id: 'alloc_25_w9', companyId: '1', startDate: '2025-07-27T00:00:00.000Z', endDate: '2025-07-31T23:59:59.000Z', gallons: 80000 }, // Shorter week
];


// --- API Functions ---

// Simulate async calls with Promise.resolve()

export const getCompanies = async (): Promise<Company[]> => {
  return Promise.resolve(companies);
};

export const getCompanyById = async (companyId: string): Promise<Company | undefined> => {
  return Promise.resolve(companies.find(c => c.id === companyId));
};

export const getUsersByCompany = async (companyId: string): Promise<User[]> => {
  return Promise.resolve(users.filter(u => u.companyId === companyId));
};

export const getUserById = async (userId: string): Promise<User | undefined> => {
    return Promise.resolve(users.find(u => u.id === userId));
};

export const addUser = async (userData: Omit<User, 'id'>): Promise<User> => {
    const newUser: User = { ...userData, id: `u${Date.now()}` };
    users.push(newUser);
    return Promise.resolve(newUser);
};

export const updateUser = async (updatedUser: User): Promise<User> => {
    const index = users.findIndex(u => u.id === updatedUser.id);
    if (index === -1) throw new Error("User not found");
    users[index] = updatedUser;
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
export const bulkAddUsageEntries = async (entries: Omit<UsageEntry, 'id'>[], mode: 'overwrite' | 'new_only'): Promise<{ added: number, updated: number }> => {
  let added = 0;
  let updated = 0;

  entries.forEach(newEntry => {
    const existingIndex = usageData.findIndex(d => d.userId === newEntry.userId && d.date === newEntry.date);
    
    if (existingIndex !== -1) {
      if (mode === 'overwrite') {
        usageData[existingIndex] = { ...newEntry, id: usageData[existingIndex].id };
        updated++;
      }
      // If mode is 'new_only' and it exists, we do nothing.
    } else {
      // If it doesn't exist, we add it regardless of the mode.
      usageData.push({ ...newEntry, id: `u${Date.now()}${Math.random()}` });
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
    
    // Return allocations that are company-wide (no userId) or specific to this user
    return Promise.resolve(
        allocations.filter(a => a.companyId === user.companyId && (!a.userId || a.userId === userId))
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


    



