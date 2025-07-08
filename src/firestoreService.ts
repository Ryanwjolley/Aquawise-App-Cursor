import { collection, addDoc } from "firebase/firestore";
import { db } from "./firebaseConfig"; // Assuming firebaseConfig.ts is in the same directory

interface UsageData {
  userId: string;
  date: string; // Or use Firebase Timestamp if you need more precise time
  consumption: number;
}

const addUsageEntry = async (usageEntry: UsageData): Promise<void> => {
  try {
    const docRef = await addDoc(collection(db, "usageData"), usageEntry);
    console.log("Document written with ID: ", docRef.id);
  } catch (e) {
    console.error("Error adding document: ", e);
    throw e; // Re-throw the error for handling in the calling code
  }
};

export { addUsageEntry };