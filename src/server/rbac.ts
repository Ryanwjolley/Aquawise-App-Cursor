import { getAdminApp } from '@/server/firebaseAdmin';
import { normalizeRole, hasAtLeast, canImpersonate } from '@/lib/roles';

export type AllowedRole = 'super_admin' | 'admin' | 'manager' | 'customer';

// Fetch canonical role (from custom claims first, then company user doc)
async function fetchEffectiveRole(companyId: string, uid: string): Promise<string> {
  const adminApp = await getAdminApp();
  try {
    const u = await adminApp.auth().getUser(uid);
    const claim = (u.customClaims as any)?.role;
    if (claim) return claim;
  } catch {}
  const snap = await adminApp.firestore().collection('companies').doc(companyId).collection('users').doc(uid).get();
  if (!snap.exists) return 'customer';
  return (snap.data() as any)?.role || 'customer';
}

export async function assertCompanyRole(companyId: string, actorUserId: string, allowed: AllowedRole[]) {
  const rawRole = await fetchEffectiveRole(companyId, actorUserId);
  const actor = normalizeRole(rawRole);
  // If any allowed is satisfied
  const ok = allowed.some(a => hasAtLeast(actor, a as any));
  if (!ok) throw new Error('forbidden');
}

export interface ImpersonationRoles {
  actorRole: string;
  targetRole: string;
}

// Validates that actor can impersonate target and returns the canonical roles for auditing/logging.
export async function assertImpersonation(companyId: string, actorUserId: string, targetUserId: string): Promise<ImpersonationRoles> {
  const adminApp = await getAdminApp();
  const actorRoleRaw = await fetchEffectiveRole(companyId, actorUserId);
  const actorRole = normalizeRole(actorRoleRaw);
  const targetSnap = await adminApp.firestore().collection('companies').doc(companyId).collection('users').doc(targetUserId).get();
  if (!targetSnap.exists) throw new Error('target_not_found');
  const targetRole = normalizeRole(((targetSnap.data() as any)?.role) || 'customer');
  if (!canImpersonate(actorRole, targetRole)) throw new Error('forbidden');
  return { actorRole, targetRole };
}




