import { collection, addDoc, query, where, getDocs, Timestamp, doc, setDoc, getDoc, deleteDoc, orderBy, limit } from "firebase/firestore";
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

export interface Invite {
  id: string;
  name: string;
  email: string;
  shares: number;
}

const usersCollection = collection(db, "users");
const usageCollection = collection(db, "usageData");
const invitesCollection = collection(db, "invites");

export const createUserDocument = async (
  uid: string,
  data: { name: string; email: string; shares: number }
): Promise<void> => {
  try {
    const userDocRef = doc(db, 'users', uid);
    const role = data.email.toLowerCase() === 'admin@aquawise.com' ? 'admin' : 'customer';

    await setDoc(userDocRef, {
      name: data.name,
      email: data.email,
      shares: data.shares,
      role: role,
    });
  } catch (e) {
    console.error('Error creating user document: ', e);
    throw e;
  }
};

export const inviteUser = async (data: {name: string, email: string, shares: number}): Promise<void> => {
  try {
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
      return { id: doc.id, ...doc.data() } as Invite;
    }
    return null;
  } catch (e) {
    console.error("Error getting invite: ", e);
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

export const updateUser = async (id: string, user: { name: string; shares: number; role: 'admin' | 'customer' }): Promise<void> => {
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
