import { db } from '@/firebaseConfig';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import type { Allocation } from '@/lib/data';

export async function getAllocationsByCompanyFS(companyId: string): Promise<Allocation[]> {
  const col = collection(db, 'companies', companyId, 'allocations');
  const snap = await getDocs(query(col, orderBy('startDate', 'desc')));
  return snap.docs.map((d) => {
    const raw = d.data() as Partial<Allocation>;
    return { id: d.id, ...raw } as Allocation;
  });
}




