import { collection, addDoc, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "./firebaseConfig"; // Assuming firebaseConfig.ts is in the same directory

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


export { addUsageEntry, getUsageForDateRange };
