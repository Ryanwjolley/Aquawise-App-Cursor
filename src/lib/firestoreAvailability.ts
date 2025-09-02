import { db } from '@/firebaseConfig';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import type { WaterAvailability } from '@/lib/data';

export async function getWaterAvailabilitiesFS(companyId: string): Promise<WaterAvailability[]> {
  const col = collection(db, 'companies', companyId, 'waterAvailabilities');
  const snap = await getDocs(query(col, orderBy('startDate', 'asc')));
  return snap.docs.map((d) => {
    const raw = d.data() as Partial<WaterAvailability>;
    return { id: d.id, ...raw } as WaterAvailability;
  });
}


