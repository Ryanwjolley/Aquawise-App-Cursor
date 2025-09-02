import { db } from '@/firebaseConfig';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import type { WaterOrder } from '@/lib/data';
import { parseWaterOrder } from '@/lib/schemas';

export async function getWaterOrdersByCompanyFS(companyId: string): Promise<WaterOrder[]> {
  const col = collection(db, 'companies', companyId, 'waterOrders');
  const snap = await getDocs(query(col, orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => parseWaterOrder(d.id, d.data())).filter((v): v is WaterOrder => !!v);
}

export async function getWaterOrdersForUserFS(companyId: string, userId: string): Promise<WaterOrder[]> {
  const col = collection(db, 'companies', companyId, 'waterOrders');
  const snap = await getDocs(query(col, where('userId', '==', userId), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => parseWaterOrder(d.id, d.data())).filter((v): v is WaterOrder => !!v);
}




