import { getAdminApp } from '@/server/firebaseAdmin';

export interface ImpersonationAudit {
  id?: string;
  actorUserId: string;
  actorRole: string;
  targetUserId: string;
  targetRole: string;
  companyId: string;
  startedAt: string;
  endedAt?: string;
  active: boolean;
}

export async function logImpersonationStart(companyId: string, actorUserId: string, actorRole: string, targetUserId: string, targetRole: string): Promise<string> {
  const db = (await getAdminApp()).firestore();
  const ref = db.collection('companies').doc(companyId).collection('impersonationEvents').doc();
  const record: ImpersonationAudit = {
    actorUserId,
    actorRole,
    targetUserId,
    targetRole,
    companyId,
    startedAt: new Date().toISOString(),
    active: true,
  };
  await ref.set({ ...record, id: ref.id });
  return ref.id;
}

export async function logImpersonationEnd(companyId: string, recordId: string) {
  const db = (await getAdminApp()).firestore();
  const ref = db.collection('companies').doc(companyId).collection('impersonationEvents').doc(recordId);
  await ref.set({ active: false, endedAt: new Date().toISOString() }, { merge: true });
}
