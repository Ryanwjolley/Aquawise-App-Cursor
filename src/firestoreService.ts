import { collection, addDoc, query, where, getDocs, Timestamp, doc, setDoc, getDoc, deleteDoc, orderBy } from "firebase/firestore";
import { db } from "./firebaseConfig";
import { format, eachDayOfInterval } from 'date-fns';

interface UsageData {
  userId: string;
  date: Timestamp;
  consumption: number;
}

export interface DailyUsage {
  day: string; // 'Sun', 'Mon', etc.
  gallons: number;
}

export interface User {
  id: string; // This will be the Firebase Auth UID
  name: string;
  shares: number;
  email: string;
  role: 'admin' | 'customer';
}

const usersCollection = collection(db, "users");
const usageCollection = collection(db, "usageData");

export const createUserDocument = async (
  uid: string,
  data: { name: string; email: string }
): Promise<void> => {
  try {
    const userDocRef = doc(db, 'users', uid);
    // Assign 'admin' role if the email matches, otherwise 'customer'
    const role = data.email.toLowerCase() === 'admin@aquawise.com' ? 'admin' : 'customer';

    await setDoc(userDocRef, {
      ...data,
      shares: role === 'admin' ? 0 : 5, // Admins don't have shares, customers start with 5.
      role: role,
    });
  } catch (e) {
    console.error('Error creating user document: ', e);
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

export const getUsers = async (): Promise<User[]> => {
  try {
    const q = query(usersCollection, orderBy('name'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  } catch (e) {
    console.error("Error getting users: ", e);
    throw e;
  }
};

export const updateUser = async (id: string, user: { name: string; shares: number }): Promise<void> => {
  try {
    const userDoc = doc(db, "users", id);
    await setDoc(userDoc, user, { merge: true });
  } catch (e) {
    console.error("Error updating user: ", e);
    throw e;
  }
};

export const addUsageEntry = async (usageEntry: {userId: string, date: string, consumption: number}): Promise<void> => {
  try {
    // Ensure date is treated as UTC to avoid timezone issues
    const date = new Date(usageEntry.date + 'T00:00:00Z');
    const dataWithTimestamp: UsageData = {
        ...usageEntry,
        date: Timestamp.fromDate(date)
    };
    await addDoc(usageCollection, dataWithTimestamp);
  } catch (e) {
    console.error("Error adding document: ", e);
    throw e;
  }
};


export const getUsageForDateRange = async (userIds: string[], startDate: Date, endDate: Date): Promise<Record<string, number>> => {
    const usageMap: Record<string, number> = {};
    userIds.forEach(id => (usageMap[id] = 0));

    if (userIds.length === 0) {
        return usageMap;
    }

    try {
        // Use a single 'in' query for efficiency. Note Firestore 'in' has a limit of 30 items.
        // For larger user sets, this would need batching. For this app, it's fine.
        const q = query(
          usageCollection,
          where("userId", "in", userIds),
          where("date", ">=", startDate),
          where("date", "<=", endDate)
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

export const setWeeklyAllocation = async (weekStartDate: Date, gallons: number): Promise<void> => {
  const weekId = format(weekStartDate, 'yyyy-MM-dd');
  try {
    const docRef = doc(db, "weeklyAllocations", weekId);
    await setDoc(docRef, { gallonsPerShare: gallons });
  } catch (e) {
    console.error("Error setting weekly allocation: ", e);
    throw e;
  }
};

export const getWeeklyAllocation = async (weekStartDate: Date): Promise<number | null> => {
  const weekId = format(weekStartDate, 'yyyy-MM-dd');
  try {
    const docRef = doc(db, "weeklyAllocations", weekId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().gallonsPerShare;
    } else {
      return null;
    }
  } catch (e)
  {
    console.error("Error getting weekly allocation: ", e);
    throw e;
  }
};


export const getDailyUsageForDateRange = async (userId: string, startDate: Date, endDate: Date): Promise<DailyUsage[]> => {
    
    const daysInInterval = eachDayOfInterval({ start: startDate, end: endDate });
    const dailyUsageData: DailyUsage[] = daysInInterval.map(day => ({
      day: format(day, 'EEE'),
      gallons: 0,
    }));

    // Firestore `in` query is limited to 10 items.
    // For a weekly view (7 days), we can query per day. This is more efficient than querying the whole range and sorting in JS.
    try {
        const q = query(
            usageCollection,
            where("userId", "==", userId),
            where("date", ">=", startDate),
            where("date", "<=", endDate)
        );
        
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            const data = doc.data() as UsageData;
            const docDate = data.date.toDate();
            // Find the corresponding day in our pre-built array
            const dayIndex = daysInInterval.findIndex(intervalDay => format(intervalDay, 'yyyy-MM-dd') === format(docDate, 'yyyy-MM-dd'));

            if (dayIndex !== -1) {
                dailyUsageData[dayIndex].gallons += data.consumption;
            }
        });
    } catch (error) {
        console.error("Error fetching daily usage data: ", error);
    }
      
    return dailyUsageData;
};
