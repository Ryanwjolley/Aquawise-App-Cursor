'use server';
import { collection, addDoc, query, where, getDocs, Timestamp, doc, setDoc, getDoc, deleteDoc, orderBy, limit, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "./firebaseConfig";
import { format, eachDayOfInterval } from 'date-fns';

interface UsageData {
  userId: string;
  companyId: string;
  date: Timestamp;
  consumption: number;
}

export interface DailyUsage {
  day: string; // 'Sun', 'Mon', etc.
  gallons: number;
}

export interface Company {
    id: string;
    name: string;
    // Add other company-specific details here later
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

export interface Allocation {
  id:string;
  companyId: string;
  startDate: Date;
  endDate: Date;
  totalAllocationGallons: number;
  inputType?: 'volume' | 'flow';
  inputValue?: number;
  volumeUnit?: 'gallons' | 'acre-feet';
  flowUnit?: 'gpm' | 'cfs';
}

export type AllocationData = Omit<Allocation, 'id'> & { id?: string };

export interface NotificationRule {
    id: string;
    companyId: string;
    type: 'usage' | 'allocation';
    threshold: number | null; // e.g. 75 for 75%
    message: string; // Message template
    enabled: boolean;
    createdAt: Date;
}

export type NotificationRuleData = Omit<NotificationRule, 'id'>;

const companiesCollection = collection(db, "companies");
const usersCollection = collection(db, "users");
const usageCollection = collection(db, "usageData");
const invitesCollection = collection(db, "invites");
const allocationsCollection = collection(db, "allocations");
const notificationRulesCollection = collection(db, "notificationRules");

// Company Service
export const getCompanies = async (): Promise<Company[]> => {
    try {
        const querySnapshot = await getDocs(companiesCollection);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));
    } catch(e) {
        console.error("Error getting companies: ", e);
        throw e;
    }
}

export const addCompany = async (name: string): Promise<string> => {
    try {
        const docRef = await addDoc(companiesCollection, { name });
        return docRef.id;
    } catch(e) {
        console.error("Error adding company: ", e);
        throw e;
    }
}


// Notification Rules Service
export const getNotificationRules = async (companyId: string): Promise<NotificationRule[]> => {
    try {
        const q = query(notificationRulesCollection, where("companyId", "==", companyId), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: (data.createdAt as Timestamp).toDate(),
            } as NotificationRule;
        });
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

export const getUsers = async (companyId: string): Promise<User[]> => {
  try {
    const q = query(usersCollection, where("companyId", "==", companyId));
    const querySnapshot = await getDocs(q);
    const users = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    // Sort by name in the application code to avoid needing a composite index
    return users.sort((a, b) => a.name.localeCompare(b.name));
  } catch (e) {
    console.error("Error getting users: ", e);
    throw e;
  }
};

export const updateUser = async (id: string, user: { name: string; shares: number; role: 'admin' | 'customer' }): Promise<void> => {
  try {
    const userDoc = doc(db, "users", id);
    await updateDoc(userDoc, user);
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

export const addUsageEntry = async (usageEntry: {userId: string, companyId: string, date: string, consumption: number}): Promise<void> => {
  try {
    const date = new Date(usageEntry.date);
    const utcDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
    const dataWithTimestamp: UsageData = {
        ...usageEntry,
        date: Timestamp.fromDate(utcDate)
    };
    await addDoc(usageCollection, dataWithTimestamp);
  } catch (e) {
    console.error("Error adding document: ", e);
    throw e;
  }
};


export const getUsageForDateRange = async (userIds: string[], companyId: string, startDate: Date, endDate: Date): Promise<Record<string, number>> => {
    const usageMap: Record<string, number> = {};
    userIds.forEach(id => (usageMap[id] = 0));

    if (userIds.length === 0) {
        return usageMap;
    }

    try {
        const q = query(
          usageCollection,
          where("companyId", "==", companyId),
          where("userId", "in", userIds),
          where("date", ">=", startDate),
          where("date", "<=", endDate),
        );
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const userId = data.userId;
            if (usageMap[userId] !== undefined) {
                usageMap[userId] += data.consumption;
            }
        });
    } catch (error) {
        console.error("Error fetching usage data for range: ", error);
    }
    
    return usageMap;
}

export const setAllocation = async (data: AllocationData): Promise<void> => {
  try {
    const { id, ...rest } = data;
    await addDoc(allocationsCollection, { 
        ...rest,
        startDate: Timestamp.fromDate(data.startDate),
        endDate: Timestamp.fromDate(data.endDate),
     });
  } catch (e) {
    console.error("Error setting allocation: ", e);
    throw e;
  }
};

export const updateAllocation = async (id: string, data: AllocationData): Promise<void> => {
  try {
    const allocationDoc = doc(db, "allocations", id);
    const { id: dataId, ...rest } = data;
    await updateDoc(allocationDoc, {
      ...rest,
      startDate: Timestamp.fromDate(data.startDate),
      endDate: Timestamp.fromDate(data.endDate),
    });
  } catch (e) {
    console.error("Error updating allocation: ", e);
    throw e;
  }
};

export const deleteAllocation = async (id: string): Promise<void> => {
  try {
    const allocationDoc = doc(db, "allocations", id);
    await deleteDoc(allocationDoc);
  } catch (e) {
    console.error("Error deleting allocation: ", e);
    throw e;
  }
};

export const getAllocationsForPeriod = async (companyId: string, startDate: Date, endDate: Date): Promise<Allocation[]> => {
    try {
        const q = query(
            allocationsCollection,
            where("companyId", "==", companyId),
            where("startDate", "<=", endDate)
        );

        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            return [];
        }

        const allocations = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                startDate: (data.startDate as Timestamp).toDate(),
                endDate: (data.endDate as Timestamp).toDate(),
                totalAllocationGallons: data.totalAllocationGallons,
                companyId: data.companyId,
                inputType: data.inputType,
                inputValue: data.inputValue,
                volumeUnit: data.volumeUnit,
                flowUnit: data.flowUnit,
            } as Allocation;
        });

        return allocations.filter(alloc => alloc.endDate >= startDate);

    } catch (e) {
        console.error("Error getting allocations for period: ", e);
        throw e;
    }
};

export const getAllocations = async (companyId: string): Promise<Allocation[]> => {
    try {
        const q = query(allocationsCollection, where("companyId", "==", companyId));
        const querySnapshot = await getDocs(q);
        const allocations = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                startDate: (data.startDate as Timestamp).toDate(),
                endDate: (data.endDate as Timestamp).toDate(),
                totalAllocationGallons: data.totalAllocationGallons,
                companyId: data.companyId,
                inputType: data.inputType,
                inputValue: data.inputValue,
                volumeUnit: data.volumeUnit,
                flowUnit: data.flowUnit,
            } as Allocation;
        });
        // Sort by start date in the application code to avoid needing a composite index
        return allocations.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    } catch (e) {
        console.error("Error getting all allocations: ", e);
        throw e;
    }
};


export const getDailyUsageForDateRange = async (userId: string, companyId: string, startDate: Date, endDate: Date): Promise<DailyUsage[]> => {
    
    const daysInInterval = eachDayOfInterval({ start: startDate, end: endDate });
    const dailyUsageMap = new Map<string, number>();

    daysInInterval.forEach(day => {
      dailyUsageMap.set(format(day, 'yyyy-MM-dd'), 0);
    });

    try {
        const q = query(
            usageCollection,
            where("userId", "==", userId),
            where("companyId", "==", companyId),
            where("date", ">=", startDate),
            where("date", "<=", endDate),
            orderBy("date")
        );
        
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            const data = doc.data() as UsageData;
            const docDate = data.date.toDate();
            const dateKey = format(docDate, 'yyyy-MM-dd');
            if (dailyUsageMap.has(dateKey)) {
                dailyUsageMap.set(dateKey, dailyUsageMap.get(dateKey)! + data.consumption);
            }
        });
    } catch (error) {
        console.error("Error fetching daily usage data: ", error);
    }
      
    return daysInInterval.map(day => ({
      day: format(day, 'EEE'),
      gallons: dailyUsageMap.get(format(day, 'yyyy-MM-dd')) || 0,
    }));
};
