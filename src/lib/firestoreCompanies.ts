import { db } from '@/firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import type { Company } from '@/lib/data';

export async function getCompaniesFS(): Promise<Company[]> {
  const col = collection(db, 'companies');
  const snap = await getDocs(col);
  return snap.docs.map((d) => {
    const data = d.data() as Partial<Company>;
    return {
      id: d.id,
      name: data.name ?? 'Company',
      defaultUnit: data.defaultUnit ?? 'gallons',
      userGroupsEnabled: Boolean(data.userGroupsEnabled),
      waterOrdersEnabled: Boolean(data.waterOrdersEnabled),
      notificationSettings: data.notificationSettings as Company['notificationSettings'],
    } as Company;
  });
}




