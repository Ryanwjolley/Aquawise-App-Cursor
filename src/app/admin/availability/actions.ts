"use server";

import { getAdminApp } from '@/server/firebaseAdmin';
import type { WaterAvailability } from '@/lib/data';
import { assertCompanyRole } from '@/server/rbac';

export async function addWaterAvailabilityAction(companyId: string, data: Omit<WaterAvailability, 'id' | 'companyId'>, actorUserId: string) {
  await assertCompanyRole(companyId, actorUserId, ['admin', 'manager', 'super_admin']);
  const db = (await getAdminApp()).firestore();
  const ref = db.collection('companies').doc(companyId).collection('waterAvailabilities').doc();
  await ref.set({ ...data, id: ref.id, companyId, createdAt: new Date().toISOString() });
}

export async function updateWaterAvailabilityAction(companyId: string, id: string, data: Partial<WaterAvailability>, actorUserId: string) {
  await assertCompanyRole(companyId, actorUserId, ['admin', 'manager', 'super_admin']);
  const db = (await getAdminApp()).firestore();
  await db.collection('companies').doc(companyId).collection('waterAvailabilities').doc(id).set({ ...data, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function deleteWaterAvailabilityAction(companyId: string, id: string, actorUserId: string) {
  await assertCompanyRole(companyId, actorUserId, ['admin', 'super_admin']);
  const db = (await getAdminApp()).firestore();
  await db.collection('companies').doc(companyId).collection('waterAvailabilities').doc(id).delete();
}




