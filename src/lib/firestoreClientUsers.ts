import { db } from '@/firebaseConfig';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import type { User, UserGroup } from '@/lib/data';

export async function getUsersByCompanyFS(companyId: string): Promise<User[]> {
  const col = collection(db, 'companies', companyId, 'users');
  const snap = await getDocs(query(col, orderBy('name', 'asc')));
  return snap.docs.map((d) => {
    const raw = d.data() as Partial<User>;
    return { id: d.id, ...raw } as User;
  });
}

export async function getGroupsByCompanyFS(companyId: string): Promise<UserGroup[]> {
  const col = collection(db, 'companies', companyId, 'userGroups');
  const snap = await getDocs(query(col, orderBy('name', 'asc')));
  return snap.docs.map((d) => {
    const raw = d.data() as Partial<UserGroup>;
    return { id: d.id, ...raw } as UserGroup;
  });
}




