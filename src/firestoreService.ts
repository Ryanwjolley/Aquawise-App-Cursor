import { collection, addDoc, query, where, getDocs, Timestamp, doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";
import { format } from 'date-fns';

interface UsageData {
  userId: string;
  date: Timestamp;
  consumption: number;
}

const addUsageEntry = async (usageEntry: {userId: string, date: string, consumption: number}): Promise<void> => {
  try {
    const dataWithTimestamp: UsageData = {
        ...usageEntry,
        date: Timestamp.fromDate(new Date(usageEntry.date))
    };
    const docRef = await addDoc(collection(db, "usageData"), dataWithTimestamp);
    console.log("Document written with ID: ", docRef.id);
  } catch (e) {
    console.error("Error adding document: ", e);
    throw e; // Re-throw the error for handling in the calling code
  }
};

const getUsageForDateRange = async (userIds: string[], startDate: Date, endDate: Date): Promise<Record<string, number>> => {
    const usageMap: Record<string, number> = {};
    const userIdsSet = new Set(userIds);
    userIds.forEach(id => (usageMap[id] = 0));

    if (userIds.length === 0) {
        return usageMap;
    }

    const q = query(
        collection(db, "usageData"),
        where("date", ">=", startDate),
        where("date", "<=", endDate)
    );

    try {
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (userIdsSet.has(data.userId)) {
                usageMap[data.userId] += data.consumption;
            }
        });
    } catch (error) {
        console.error("Error fetching usage data: ", error);
    }
    
    return usageMap;
}

/**
 * Sets the gallons per share for a specific week. The week is identified by its start date.
 * @param weekStartDate - The start date of the week (Sunday).
 * @param gallons - The number of gallons per share to set.
 */
const setWeeklyAllocation = async (weekStartDate: Date, gallons: number): Promise<void> => {
  const weekId = format(weekStartDate, 'yyyy-MM-dd');
  try {
    const docRef = doc(db, "weeklyAllocations", weekId);
    await setDoc(docRef, { gallonsPerShare: gallons });
  } catch (e) {
    console.error("Error setting weekly allocation: ", e);
    throw e;
  }
};

/**
 * Gets the gallons per share for a specific week.
 * @param weekStartDate - The start date of the week (Sunday).
 * @returns The gallons per share for the week, or null if not set.
 */
const getWeeklyAllocation = async (weekStartDate: Date): Promise<number | null> => {
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
    throw e; // Re-throw to be handled by caller
  }
};


export { addUsageEntry, getUsageForDateRange, setWeeklyAllocation, getWeeklyAllocation };
