import { collection, addDoc, query, where, getDocs, Timestamp, doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";
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
    await setDoc(userDocRef, {
      ...data,
      shares: 0, // Default shares
      role: 'customer', // Default role
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
    const querySnapshot = await getDocs(query(usersCollection));
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
    const dataWithTimestamp: UsageData = {
        ...usageEntry,
        date: Timestamp.fromDate(new Date(usageEntry.date))
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
      for (const userId of userIds) {
        const q = query(
          usageCollection,
          where("userId", "==", userId),
          where("date", ">=", startDate),
          where("date", "<=", endDate)
        );
        const querySnapshot = await getDocs(q);
        let totalConsumption = 0;
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            totalConsumption += data.consumption;
        });
        usageMap[userId] = totalConsumption;
      }
    } catch (error) {
        console.error("Error fetching usage data: ", error);
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
  } catch (e) {
    console.error("Error getting weekly allocation: ", e);
    throw e;
  }
};


export const getDailyUsageForDateRange = async (userId: string, startDate: Date, endDate: Date): Promise<DailyUsage[]> => {
    const q = query(
        usageCollection,
        where("userId", "==", userId),
        where("date", ">=", startDate),
        where("date", "<=", endDate)
    );

    const usageByDate: Record<string, number> = {}; // "yyyy-MM-dd": gallons

    try {
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            const data = doc.data() as UsageData;
            const dateKey = format(data.date.toDate(), 'yyyy-MM-dd');
            if (!usageByDate[dateKey]) {
                usageByDate[dateKey] = 0;
            }
            usageByDate[dateKey] += data.consumption;
        });
    } catch (error) {
        console.error("Error fetching daily usage data: ", error);
    }
    
    const daysInInterval = eachDayOfInterval({ start: startDate, end: endDate });
      
    return daysInInterval.map(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        return {
          day: format(day, 'EEE'),
          gallons: usageByDate[dateKey] || 0,
        };
    });
};
