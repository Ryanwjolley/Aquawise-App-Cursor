// Role utility helpers for consistent permission logic & impersonation rules.
// Canonical roles (least to most privileged): customer < manager < admin < super_admin

export type CanonicalRole = 'customer' | 'manager' | 'admin' | 'super_admin';

export function normalizeRole(raw?: string): CanonicalRole {
  const r = (raw || '').toLowerCase();
  if (r.includes('super')) return 'super_admin';
  if (r.includes('admin')) return 'admin';
  if (r.includes('manager')) return 'manager';
  return 'customer';
}

const RANK: Record<CanonicalRole, number> = {
  customer: 0,
  manager: 1,
  admin: 2,
  super_admin: 3,
};

export function hasAtLeast(role: string | undefined, min: CanonicalRole): boolean {
  return RANK[normalizeRole(role)] >= RANK[min];
}

// Impersonation matrix:
// super_admin -> anyone (any company)
// admin -> manager, customer within same company
// manager -> customer within same company
// customer -> none
export function canImpersonate(actorRole: string | undefined, targetRole: string | undefined): boolean {
  const actor = normalizeRole(actorRole);
  const target = normalizeRole(targetRole);
  if (actor === 'super_admin') return true;
  if (actor === 'admin') return target !== 'admin' && target !== 'super_admin';
  if (actor === 'manager') return target === 'customer';
  return false;
}

export function isPrivileged(role: string | undefined): boolean {
  const r = normalizeRole(role);
  return r === 'super_admin' || r === 'admin' || r === 'manager';
}
