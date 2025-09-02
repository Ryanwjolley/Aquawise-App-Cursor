import { db } from '@/firebaseConfig';
import { collection, doc, getDocs, orderBy, query, setDoc, updateDoc, where } from 'firebase/firestore';
import type { Notification } from '@/lib/data';
import { parseNotification } from '@/lib/schemas';

export async function getNotificationsForUserFS(companyId: string, userId: string): Promise<Notification[]> {
  const col = collection(db, 'companies', companyId, 'notifications');
  const snap = await getDocs(query(col, where('userId', '==', userId), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => parseNotification(d.id, d.data())).filter((v): v is Notification => !!v);
}

export async function markNotificationAsReadFS(companyId: string, id: string) {
  const ref = doc(db, 'companies', companyId, 'notifications', id);
  await updateDoc(ref, { isRead: true });
}

export async function markAllNotificationsAsReadFS(companyId: string, userId: string) {
  const col = collection(db, 'companies', companyId, 'notifications');
  const snap = await getDocs(query(col, where('userId', '==', userId)));
  const updates = snap.docs.map((d) => updateDoc(d.ref, { isRead: true }));
  await Promise.all(updates);
}




