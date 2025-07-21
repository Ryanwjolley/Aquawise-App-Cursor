'use server';
import { collection, addDoc, query, where, getDocs, Timestamp, doc, setDoc, getDoc, deleteDoc, orderBy, limit, updateDoc, writeBatch, runTransaction } from "firebase/firestore";
import { db } from "./firebaseConfig";
import { format, eachDayOfInterval, startOfDay } from 'date-fns';

interface UsageData {
  userId: string;
  companyId: string;
  date: Timestamp;
  consumption: number;
}

export interface Company {
    id: string;
    name: string;
}

export interface User {
  id: string; // This will be the Firebase Auth UID
  companyId: string;
  name: string;
  shares: number;
  email: string;
  role: 'admin' | 'customer';
  status: 'active' | 'inactive' | 'invited';
}

export interface Invite {
  id: string;
  companyId: string;
  name: string;
  email: string;
  shares: number;
  status: 'invited';
  role: 'customer' | 'admin';
}

export interface NotificationRule {
    id: string;
    companyId: string;
    type: 'usage' | 'allocation';
    threshold: number | null; // e.g. 75 for 75%
    message: string; // Message template
    enabled: boolean;
    createdAt: Date;
}

export interface DailyUsage {
    day: string;
    gallons: number;
}

export interface UsageEntry {
    id: string;
    date: Date;
    consumption: number;
}

export interface ParsedUsageEntry {
    userId: string;
    companyId: string;
    date: string;
    consumption: number;
}

export type NotificationRuleData = Omit<NotificationRule, 'id'>;
export type UploadMode = 'overwrite' | 'new_only';

const companiesCollection = collection(db, "companies");
const usersCollection = collection(db, "users");
const usageCollection = collection(db, "usageData");
const invitesCollection = collection(db, "invites");
const notificationRulesCollection = collection(db, "notificationRules");

// Company Service
export const getCompanies = async (): Promise<Company[]> => {
    try {
        const querySnapshot = await getDocs(query(companiesCollection, orderBy("name")));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));
    } catch(e) {
        console.error("Error getting companies: ", e);
        throw e;
    }
}

export const getCompany = async (companyId: string): Promise<Company | null> => {
    try {
        const companyDoc = await getDoc(doc(db, "companies", companyId));
        if (companyDoc.exists()) {
            return { id: companyDoc.id, ...companyDoc.data() } as Company;
        }
        return null;
    } catch (e) {
        console.error("Error getting company: ", e);
        throw e;
    }
};

export const addCompany = async (data: { companyName: string, adminName: string, adminEmail: string }): Promise<void> => {
    try {
        await runTransaction(db, async (transaction) => {
            // 1. Check if a user with the admin's email already exists
            const userQuery = query(usersCollection, where("email", "==", data.adminEmail));
            const userSnapshot = await getDocs(userQuery); // Note: cannot use transaction.get() with queries in web sdk
            if (!userSnapshot.empty) {
                throw new Error("An active user with this email already exists.");
            }

            // 2. Create the company document
            const newCompanyRef = doc(collection(db, "companies"));
            transaction.set(newCompanyRef, { name: data.companyName });

            // 3. Create the admin user document for that company
            // We can't know the ID ahead of time, so we just create a new doc ref.
            const newAdminUserRef = doc(collection(db, "users"));
            transaction.set(newAdminUserRef, {
                companyId: newCompanyRef.id,
                name: data.adminName,
                email: data.adminEmail,
                role: 'admin',
                shares: 0, // Admins typically don't have shares
                status: 'active'
            });
        });
    } catch(e) {
        console.error("Error adding company and admin user in transaction: ", e);
        // Re-throw the error to be caught by the calling function
        throw e;
    }
}

export const updateCompany = async (id: string, data: Partial<Company>): Promise<void> => {
    try {
        const companyDoc = doc(db, "companies", id);
        await updateDoc(companyDoc, data);
    } catch (e) {
        console.error("Error updating company: ", e);
        throw e;
    }
};

export const deleteCompany = async (companyId: string): Promise<void> => {
    try {
        const batch = writeBatch(db);

        // 1. Find and delete all users for the company
        const usersQuery = query(usersCollection, where("companyId", "==", companyId));
        const usersSnapshot = await getDocs(usersQuery);
        usersSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        // 2. Find and delete all invites for the company
        const invitesQuery = query(invitesCollection, where("companyId", "==", companyId));
        const invitesSnapshot = await getDocs(invitesQuery);
        invitesSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        // 3. Find and delete all notification rules for the company
        const rulesQuery = query(notificationRulesCollection, where("companyId", "==", companyId));
        const rulesSnapshot = await getDocs(rulesQuery);
        rulesSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        // 4. Find and delete all usage data for the company
        const usageQuery = query(usageCollection, where("companyId", "==", companyId));
        const usageSnapshot = await getDocs(usageQuery);
        usageSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });


        // 5. Delete the company document
        const companyDocRef = doc(db, "companies", companyId);
        batch.delete(companyDocRef);

        // 6. Commit the batch
        await batch.commit();
    } catch (e) {
        console.error("Error deleting company and its users: ", e);
        throw e;
    }
};


// Notification Rules Service
export const getNotificationRules = async (companyId: string): Promise<NotificationRule[]> => {
    try {
        const q = query(notificationRulesCollection, where("companyId", "==", companyId));
        const querySnapshot = await getDocs(q);
        const rules = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: (data.createdAt as Timestamp).toDate(),
            } as NotificationRule;
        });
        return rules.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (e) {
        console.error("Error getting notification rules: ", e);
        throw e;
    }
};

export const addNotificationRule = async (rule: NotificationRuleData): Promise<void> => {
    try {
        await addDoc(notificationRulesCollection, {
            ...rule,
            createdAt: Timestamp.fromDate(rule.createdAt),
        });
    } catch (e) {
        console.error("Error adding notification rule: ", e);
        throw e;
    }
};

export const updateNotificationRule = async (id: string, data: Partial<NotificationRuleData>): Promise<void> => {
    try {
        const ruleDoc = doc(db, "notificationRules", id);
        await updateDoc(ruleDoc, data);
    } catch (e) {
        console.error("Error updating notification rule: ", e);
        throw e;
    }
};

export const deleteNotificationRule = async (id: string): Promise<void> => {
    try {
        const ruleDoc = doc(db, "notificationRules", id);
        await deleteDoc(ruleDoc);
    } catch (e) {
        console.error("Error deleting notification rule: ", e);
        throw e;
    }
};


export const createUserDocument = async (
  uid: string,
  data: { companyId: string, name: string; email: string; shares: number; role: 'admin' | 'customer' }
): Promise<void> => {
  try {
    const userDocRef = doc(db, 'users', uid);
    await setDoc(userDocRef, {
      ...data,
      status: 'active',
    });
  } catch (e) {
    console.error('Error creating user document: ', e);
    throw e;
  }
};

export const inviteUser = async (data: {companyId: string, name: string, email: string, shares: number, role: 'customer' | 'admin'}): Promise<void> => {
  try {
    // Check if user with this email already exists across all companies
    const userQuery = query(usersCollection, where("email", "==", data.email), limit(1));
    const userSnapshot = await getDocs(userQuery);
    if (!userSnapshot.empty) {
      throw new Error("A user with this email already exists.");
    }
    // Check if invite for this email already exists
    const inviteQuery = query(invitesCollection, where("email", "==", data.email), limit(1));
    const inviteSnapshot = await getDocs(inviteQuery);
    if (!inviteSnapshot.empty) {
      throw new Error("An invitation for this email has already been sent.");
    }

    await addDoc(invitesCollection, data);
  } catch (e) {
    console.error('Error inviting user: ', e);
    throw e;
  }
};

export const getInvite = async (email: string): Promise<Invite | null> => {
  try {
    const q = query(invitesCollection, where("email", "==", email), limit(1));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data(), status: 'invited' } as Invite;
    }
    return null;
  } catch (e) {
    console.error("Error getting invite: ", e);
    throw e;
  }
};

export const getInvites = async (companyId: string): Promise<Invite[]> => {
  try {
    const q = query(invitesCollection, where("companyId", "==", companyId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), status: 'invited' } as Invite));
  } catch (e) {
    console.error("Error getting invites: ", e);
    throw e;
  }
};


export const deleteInvite = async (id: string): Promise<void> => {
  try {
    const inviteDoc = doc(db, "invites", id);
    await deleteDoc(inviteDoc);
  } catch (e) {
    console.error("Error deleting invite: ", e);
    throw e;
  }
};


export const getUser = async (uid: string): Promise<User | null> => {
  try {
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() } as User;
    }
    return null;
  } catch (e) {
    console.error("Error getting user: ", e);
    throw e;
  }
};

export const getAdminForCompany = async (companyId: string): Promise<User | null> => {
    try {
        const q = query(usersCollection, where("companyId", "==", companyId), where("role", "==", "admin"), limit(1));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const adminDoc = querySnapshot.docs[0];
            return { id: adminDoc.id, ...adminDoc.data() } as User;
        }
        return null;
    } catch (e) {
        console.error("Error getting admin for company: ", e);
        throw e;
    }
};

export const getUsers = async (companyId: string): Promise<User[]> => {
  try {
    const q = companyId === 'system-admin' 
        ? query(usersCollection) // Super admin gets all users
        : query(usersCollection, where("companyId", "==", companyId));
    const querySnapshot = await getDocs(q);
    const users = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    // Sort by name in the application code to avoid needing a composite index
    return users.sort((a, b) => a.name.localeCompare(b.name));
  } catch (e) {
    console.error("Error getting users: ", e);
    throw e;
  }
};

export const updateUser = async (id: string, user: Partial<User>): Promise<void> => {
  try {
    const userDoc = doc(db, "users", id);
    // We remove fields that shouldn't be editable this way, like email, id, companyId
    const { email, id: userId, companyId, ...updateData } = user;
    await updateDoc(userDoc, updateData);
  } catch (e) {
    console.error("Error updating user: ", e);
    throw e;
  }
};

export const updateUserStatus = async (id: string, status: 'active' | 'inactive'): Promise<void> => {
  try {
    const userDoc = doc(db, "users", id);
    await updateDoc(userDoc, { status });
  } catch (e) {
    console.error("Error updating user status: ", e);
    throw e;
  }
};

export const deleteUser = async (userId: string): Promise<void> => {
  try {
    // Check for usage history first
    const usageQuery = query(usageCollection, where("userId", "==", userId), limit(1));
    const usageSnapshot = await getDocs(usageQuery);

    if (!usageSnapshot.empty) {
      throw new Error("Cannot delete a user with usage history. Please deactivate them instead.");
    }

    const userDocRef = doc(db, 'users', userId);
    await deleteDoc(userDocRef);
    
  } catch (e) {
    console.error("Error deleting user: ", e);
    throw e;
  }
};


const toUTCDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Date(date.getTime() + date.getTimezoneOffset() * 60000);
}

// Find existing usage entries for a set of users and dates.
// Returns a Map where the key is "userId-YYYY-MM-DD" and the value is the document ID.
export const findExistingUsageForUsersAndDates = async (entries: ParsedUsageEntry[]): Promise<Map<string, string>> => {
    const existingEntries = new Map<string, string>();
    if (entries.length === 0) return existingEntries;

    // Create a set of unique user IDs and a set of dates to check for each user.
    const userIds = [...new Set(entries.map(e => e.userId))];
    const datesToCheck = [...new Set(entries.map(e => e.date))];

    // Batch queries by user to avoid hitting Firestore query limits and improve performance.
    const queryPromises = userIds.map(userId => 
        getDocs(query(usageCollection, where("userId", "==", userId)))
    );
    
    const snapshots = await Promise.all(queryPromises);

    // Filter the results in memory.
    for (const snapshot of snapshots) {
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const dateStr = format(data.date.toDate(), 'yyyy-MM-dd');

            // Only consider entries that are in our list of dates to check
            if (datesToCheck.includes(dateStr)) {
                const key = `${data.userId}-${dateStr}`;
                existingEntries.set(key, docSnap.id);
            }
        });
    }
    
    return existingEntries;
};

export const bulkAddUsageEntries = async (entries: ParsedUsageEntry[], mode: UploadMode): Promise<{ added: number; updated: number; }> => {
    let added = 0;
    let updated = 0;
    
    const existingEntriesMap = await findExistingUsageForUsersAndDates(entries);
    const batch = writeBatch(db);

    for (const entry of entries) {
        const key = `${entry.userId}-${entry.date}`;
        const existingDocId = existingEntriesMap.get(key);

        if (existingDocId) {
            // This entry is a duplicate
            if (mode === 'overwrite') {
                const docRef = doc(db, 'usageData', existingDocId);
                batch.update(docRef, { consumption: entry.consumption });
                updated++;
            }
            // If mode is 'new_only', we do nothing.
        } else {
            // This is a new entry
            const newDocRef = doc(collection(db, 'usageData'));
            const dataWithTimestamp: UsageData = {
                ...entry,
                date: Timestamp.fromDate(toUTCDate(entry.date))
            };
            batch.set(newDocRef, dataWithTimestamp);
            added++;
        }
    }

    await batch.commit();
    return { added, updated };
};


export const getTotalUsageForDateRange = async (userId: string, companyId: string, startDate: Date, endDate: Date): Promise<number> => {
    let totalUsage = 0;
    try {
        const q = query(
          usageCollection,
          where("userId", "==", userId),
          where("date", ">=", startDate),
          where("date", "<=", endDate),
        );
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            // Secondary filter for companyId
            if (doc.data().companyId === companyId) {
                totalUsage += doc.data().consumption;
            }
        });
    } catch (error) {
        console.error("Error fetching total usage data for range: ", error);
        throw error;
    }
    return totalUsage;
}

export const getDailyUsageForDateRange = async (userId: string, companyId: string, startDate: Date, endDate: Date): Promise<DailyUsage[]> => {
    const dailyUsageMap = new Map<string, number>();

    // Initialize map with all days in the range to ensure we show days with 0 usage
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
    dateRange.forEach(date => {
        dailyUsageMap.set(format(date, 'MMM d'), 0);
    });

    try {
        const q = query(
          usageCollection,
          where("userId", "==", userId),
          where("date", ">=", startDate),
          where("date", "<=", endDate)
        );
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Secondary filter for companyId
            if (data.companyId === companyId) {
                const day = format((data.date as Timestamp).toDate(), 'MMM d');
                const currentUsage = dailyUsageMap.get(day) || 0;
                dailyUsageMap.set(day, currentUsage + data.consumption);
            }
        });
    } catch (error) {
        console.error("Error fetching daily usage data for range: ", error);
        throw error;
    }
    
    // Convert map to array of objects for the chart
    const result: DailyUsage[] = Array.from(dailyUsageMap, ([day, gallons]) => ({ day, gallons }));
    return result;
}

export const getUsageEntriesForDateRange = async (userId: string, companyId: string, startDate: Date, endDate: Date): Promise<UsageEntry[]> => {
    const entries: UsageEntry[] = [];
    try {
        const q = query(
            usageCollection,
            where("userId", "==", userId),
            where("date", ">=", startDate),
            where("date", "<=", endDate)
        );
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            const data = doc.data();
             // Secondary filter for companyId
            if (data.companyId === companyId) {
                entries.push({
                    id: doc.id,
                    date: (data.date as Timestamp).toDate(),
                    consumption: data.consumption
                });
            }
        });
        // Sort in the client to avoid needing a composite index
        return entries.sort((a, b) => b.date.getTime() - a.date.getTime());
    } catch (error) {
        console.error("Error fetching usage entries: ", error);
        throw error;
    }
};