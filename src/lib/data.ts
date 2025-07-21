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
};

export type UsageEntry = {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD format
  usage: number; // in gallons
};

const companies: Company[] = [
  { id: '1', name: 'Golden Valley Agriculture' },
  { id: '2', name: 'Sunrise Farms' },
];

const users: User[] = [
  // Golden Valley Agriculture
  { id: '101', name: 'Alice Johnson', email: 'alice@gva.com', role: 'Admin', companyId: '1' },
  { id: '102', name: 'Bob Williams', email: 'bob@gva.com', role: 'Customer', companyId: '1' },
  { id: '103', name: 'Charlie Brown', email: 'charlie@gva.com', role: 'Customer', companyId: '1' },

  // Sunrise Farms
  { id: '201', name: 'Diana Miller', email: 'diana@sunrise.com', role: 'Admin', companyId: '2' },
  { id: '202', name: 'Evan Davis', email: 'evan@sunrise.com', role: 'Customer', companyId: '2' },
];

let usageData: UsageEntry[] = [
  // Alice (Admin)
  { id: 'u1', userId: '101', date: '2024-05-15', usage: 4500 },
  { id: 'u2', userId: '101', date: '2024-05-16', usage: 5200 },
  
  // Bob
  { id: 'u3', userId: '102', date: '2024-05-15', usage: 7800 },
  { id: 'u4', userId: '102', date: '2024-05-16', usage: 8100 },
  { id: 'u5', userId: '102', date: '2024-05-17', usage: 7600 },

  // Charlie
  { id: 'u6', userId: '103', date: '2024-05-15', usage: 3200 },
  { id: 'u7', userId: '103', date: '2024-05-16', usage: 3500 },
  
  // Diana (Admin)
  { id: 'u8', userId: '201', date: '2024-05-16', usage: 6000 },
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

export const getUsageForUser = async (userId: string, startDate?: string, endDate?: string): Promise<UsageEntry[]> => {
  let userUsage = usageData.filter(u => u.userId === userId);
  if (startDate) {
    userUsage = userUsage.filter(u => u.date >= startDate);
  }
  if (endDate) {
    userUsage = userUsage.filter(u => u.date <= endDate);
  }
  return Promise.resolve(userUsage.sort((a, b) => a.date.localeCompare(b.date)));
};

// Function to simulate bulk adding/overwriting usage data
export const bulkAddUsageEntries = (entries: Omit<UsageEntry, 'id'>[], mode: 'overwrite' | 'new_only'): { added: number, updated: number } => {
  let added = 0;
  let updated = 0;

  if (mode === 'overwrite') {
    entries.forEach(newEntry => {
      const existingIndex = usageData.findIndex(d => d.userId === newEntry.userId && d.date === newEntry.date);
      if (existingIndex !== -1) {
        usageData[existingIndex] = { ...newEntry, id: usageData[existingIndex].id };
        updated++;
      } else {
        usageData.push({ ...newEntry, id: `u${Date.now()}${Math.random()}` });
        added++;
      }
    });
  } else { // new_only
    entries.forEach(newEntry => {
      const exists = usageData.some(d => d.userId === newEntry.userId && d.date === newEntry.date);
      if (!exists) {
        usageData.push({ ...newEntry, id: `u${Date.now()}${Math.random()}` });
        added++;
      }
    });
  }
  
  return { added, updated };
};

// To support our mock implementation of checking for duplicates before upload.
export const findExistingUsageForUsersAndDates = (entriesToCheck: { userId: string, date: string }[]): string[] => {
    const existingKeys = new Set(usageData.map(entry => `${entry.userId}-${entry.date}`));
    const duplicates = entriesToCheck
        .filter(entry => existingKeys.has(`${entry.userId}-${entry.date}`))
        .map(entry => `${entry.userId}-${entry.date}`);
    return duplicates;
}
