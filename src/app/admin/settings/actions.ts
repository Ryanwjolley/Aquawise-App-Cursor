"use server";

import { getAdminApp } from '@/server/firebaseAdmin';
import { assertCompanyRole } from '@/server/rbac';
import type { Company, UserGroup, User } from '@/lib/data';

export async function updateCompanyAction(companyId: string, data: Partial<Company>, actorUserId?: string) {
  if (actorUserId) await assertCompanyRole(companyId, actorUserId, ['admin', 'super_admin']);
  const db = (await getAdminApp()).firestore();
  await db.collection('companies').doc(companyId).set({ ...data, id: companyId, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function addGroupAction(companyId: string, data: Omit<UserGroup, 'id' | 'companyId'>, actorUserId?: string) {
  if (actorUserId) await assertCompanyRole(companyId, actorUserId, ['admin', 'super_admin']);
  const db = (await getAdminApp()).firestore();
  const ref = db.collection('companies').doc(companyId).collection('userGroups').doc();
  await ref.set({ ...data, id: ref.id, companyId, createdAt: new Date().toISOString() });
}

export async function updateGroupAction(companyId: string, id: string, data: Partial<UserGroup>, actorUserId?: string) {
  if (actorUserId) await assertCompanyRole(companyId, actorUserId, ['admin', 'super_admin']);
  const db = (await getAdminApp()).firestore();
  await db.collection('companies').doc(companyId).collection('userGroups').doc(id).set({ ...data, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function deleteGroupAction(companyId: string, id: string, actorUserId?: string) {
  if (actorUserId) await assertCompanyRole(companyId, actorUserId, ['admin', 'super_admin']);
  const db = (await getAdminApp()).firestore();
  await db.collection('companies').doc(companyId).collection('userGroups').doc(id).delete();
}

export async function updateUserPreferenceAction(companyId: string, userId: string, data: Partial<User>, actorUserId?: string) {
  if (actorUserId && actorUserId !== userId) await assertCompanyRole(companyId, actorUserId, ['admin', 'manager', 'super_admin']);
  const db = (await getAdminApp()).firestore();
  await db.collection('companies').doc(companyId).collection('users').doc(userId).set({ ...data, updatedAt: new Date().toISOString() }, { merge: true });
}


