// A mock data service to simulate database interactions.
// In a real application, this would be replaced with actual database calls (e.g., to Firestore).
import sgMail from '@sendgrid/mail';
import { format } from 'date-fns';

if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

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
  { id: '101', name: 'Alice Johnson', email: 'alice@gva.com', role: 'Admin', companyId: '1' },
  { id: '102', name: 'Bob Williams', email: 'bob@gva.com', role: 'Customer', companyId: '1' },
  { id: '103', name: 'Charlie Brown', email: 'charlie@gva.com', role: 'Customer', companyId: '1' },

  // Sunrise Farms
  { id: '201', name: 'Diana Miller', email: 'diana@sunrise.com', role: 'Admin', companyId: '2' },
  { id: '202', name: 'Evan Davis', email: 'evan@sunrise.com', role: 'Customer', companyId: '2' },
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
  // Alice (Admin) - Recent Data
  { id: 'u1', userId: '101', date: getRecentDate(2), usage: 4500 },
  { id: 'u2', userId: '101', date: getRecentDate(1), usage: 5200 },
  
  // Bob - Recent Data
  { id: 'u3', userId: '102', date: getRecentDate(3), usage: 7800 },
  { id: 'u4', userId: '102', date: getRecentDate(2), usage: 8100 },
  { id: 'u5', userId: '102', date: getRecentDate(1), usage: 7600 },

  // Charlie - Older Data
  { id: 'u6', userId: '103', date: '2024-05-15', usage: 3200 },
  { id: 'u7', userId: '103', date: '2024-05-16', usage: 3500 },
  
  // Diana (Admin) - Older Data
  { id: 'u8', userId: '201', date: '2024-05-16', usage: 6000 },
];

let allocations: Allocation[] = [
    { 
        id: 'a1', 
        companyId: '1', 
        startDate: getRecentDateTime(30, 0, 0), 
        endDate: getRecentDateTime(-30, 23, 59), // 30 days from now
        gallons: 500000,
        // Applies to all users
    }
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

export const sendAllocationNotificationEmail = async (allocation: Allocation, recipients: User[], updateType: 'created' | 'updated') => {
    if (!process.env.SENDGRID_API_KEY || process.env.SENDGRID_API_KEY === "YOUR_SENDGRID_API_KEY_HERE") {
        console.log("SENDGRID_API_KEY not set. Skipping email send. Email content:");
        console.log({
            to: recipients.map(r => r.email),
            from: process.env.SENDGRID_FROM_EMAIL || 'test@example.com',
            subject: `Water Allocation ${updateType === 'updated' ? 'Updated' : 'Created'}`,
            text: `Details: ${JSON.stringify(allocation)}`
        });
        return;
    }

    const formattedStart = format(new Date(allocation.startDate), 'P p');
    const formattedEnd = format(new Date(allocation.endDate), 'P p');

    const msg = {
        to: recipients.map(r => r.email),
        from: process.env.SENDGRID_FROM_EMAIL!,
        subject: `Your Water Allocation has been ${updateType === 'updated' ? 'Updated' : 'Created'}`,
        html: `
            <p>Hello,</p>
            <p>Your water allocation has been ${updateType}. Here are the details:</p>
            <ul>
                <li><strong>Period:</strong> ${formattedStart} to ${formattedEnd}</li>
                <li><strong>Allocated Amount:</strong> ${allocation.gallons.toLocaleString()} gallons</li>
            </ul>
            <p>You can view your usage and allocation details by logging into the AquaWise dashboard.</p>
            <p>Thank you,<br/>AquaWise Team</p>
        `,
    };

    try {
        await sgMail.send(msg);
        console.log(`Allocation notification email sent to ${recipients.map(r => r.email).join(', ')}`);
    } catch (error) {
        console.error('Error sending SendGrid email', error);
    }
};
