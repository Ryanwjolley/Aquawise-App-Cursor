import { db } from '@/firebaseConfig';
import { collection, doc, getDoc, getDocs, orderBy, query, setDoc, updateDoc } from 'firebase/firestore';
import type { UsageEntry, Unit } from '@/lib/data';
import { convertToGallons } from '@/lib/utils';

export async function getCompanyUsageFS(companyId: string): Promise<UsageEntry[]> {
  const col = collection(db, 'companies', companyId, 'usage');
  const snap = await getDocs(query(col, orderBy('date', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as UsageEntry[];
}

export async function findExistingUsageAction(companyId: string, entriesToCheck: { userId: string; date: string }[]): Promise<string[]> {
  const existing: string[] = [];
  for (const e of entriesToCheck) {
    const id = `${e.userId}_${e.date}`;
    const ref = doc(db, 'companies', companyId, 'usage', id);
    const snap = await getDoc(ref);
    if (snap.exists()) existing.push(`${e.userId}-${e.date}`);
  }
  return existing;
}

export async function bulkAddUsageEntriesAction(
  companyId: string,
  entries: Omit<UsageEntry, 'id'>[],
  mode: 'overwrite' | 'new_only' | 'add' = 'overwrite',
  inputUnit: Unit = 'gallons',
  durationHours?: number
): Promise<{ added: number; updated: number }> {
  let added = 0;
  let updated = 0;

  for (const newEntry of entries) {
    const gallonsUsage = convertToGallons(newEntry.usage, inputUnit, durationHours);
    const docId = `${newEntry.userId}_${newEntry.date}`;
    const ref = doc(db, 'companies', companyId, 'usage', docId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      if (mode === 'overwrite') {
        await setDoc(ref, { ...snap.data(), ...newEntry, usage: gallonsUsage }, { merge: true });
        updated++;
      } else if (mode === 'add') {
        const current = (snap.data() as any).usage || 0;
        await updateDoc(ref, { usage: current + gallonsUsage });
        updated++;
      }
      // new_only does nothing on existing
    } else {
      if (mode !== 'new_only' || mode === 'new_only') {
        await setDoc(ref, { ...newEntry, usage: gallonsUsage });
        added++;
      }
    }
  }
  return { added, updated };
}




