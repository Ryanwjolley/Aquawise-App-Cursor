"use server";

import { getAdminApp } from '@/server/firebaseAdmin';
import { assertCompanyRole } from '@/server/rbac';
import type { Allocation } from '@/lib/data';

export async function addAllocationAction(companyId: string, data: Omit<Allocation, 'id' | 'companyId'>, actorUserId?: string) {
  if (actorUserId) await assertCompanyRole(companyId, actorUserId, ['admin', 'manager', 'super_admin']);
  const db = (await getAdminApp()).firestore();
  const ref = db.collection('companies').doc(companyId).collection('allocations').doc();
  await ref.set({ ...data, companyId, createdAt: new Date().toISOString() });
  return { id: ref.id };
}

export async function updateAllocationAction(companyId: string, id: string, data: Partial<Allocation>, actorUserId?: string) {
  if (actorUserId) await assertCompanyRole(companyId, actorUserId, ['admin', 'manager', 'super_admin']);
  const db = (await getAdminApp()).firestore();
  await db.collection('companies').doc(companyId).collection('allocations').doc(id).set({ ...data, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function deleteAllocationAction(companyId: string, id: string, actorUserId?: string) {
  if (actorUserId) await assertCompanyRole(companyId, actorUserId, ['admin', 'super_admin']);
  const db = (await getAdminApp()).firestore();
  await db.collection('companies').doc(companyId).collection('allocations').doc(id).delete();
}


