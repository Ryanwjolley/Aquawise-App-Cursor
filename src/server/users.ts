import { getAdminApp } from '@/server/firebaseAdmin';
import type { User } from '@/lib/data';

export async function addUserServer(companyId: string, data: Omit<User, 'id' | 'companyId'>) {
  const db = (await getAdminApp()).firestore();
  const docRef = db.collection('companies').doc(companyId).collection('users').doc();
  await docRef.set({ ...data, companyId, createdAt: new Date().toISOString() });
  return { id: docRef.id };
}

export async function updateUserServer(companyId: string, id: string, data: Partial<User>) {
  const db = (await getAdminApp()).firestore();
  await db.collection('companies').doc(companyId).collection('users').doc(id).set({ ...data, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function deleteUserServer(companyId: string, id: string) {
  const db = (await getAdminApp()).firestore();
  await db.collection('companies').doc(companyId).collection('users').doc(id).delete();
}




