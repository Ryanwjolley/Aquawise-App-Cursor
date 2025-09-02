"use server";

import { getAdminApp } from '@/server/firebaseAdmin';
import type { UsageEntry, Unit } from '@/lib/data';
import { convertToGallons } from '@/lib/utils';

export async function bulkAddUsageEntriesServer(
  companyId: string,
  entries: Omit<UsageEntry, 'id'>[],
  mode: 'overwrite' | 'new_only' | 'add' = 'overwrite',
  inputUnit: Unit = 'gallons',
  durationHours?: number
) {
  const db = (await getAdminApp()).firestore();
  let added = 0;
  let updated = 0;
  for (const e of entries) {
    const gallons = convertToGallons(e.usage, inputUnit, durationHours);
    const docId = `${e.userId}_${e.date}`;
    const ref = db.collection('companies').doc(companyId).collection('usage').doc(docId);
    const snap = await ref.get();
    if (snap.exists) {
      if (mode === 'overwrite') {
        await ref.set({ ...e, usage: gallons }, { merge: true });
        updated++;
      } else if (mode === 'add') {
        const current = snap.data()?.usage || 0;
        await ref.set({ usage: current + gallons }, { merge: true });
        updated++;
      }
    } else {
      await ref.set({ ...e, usage: gallons }, { merge: true });
      added++;
    }
  }
  return { added, updated };
}




