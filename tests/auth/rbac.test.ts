import { describe, it, expect } from '@jest/globals';
import { normalizeRole, hasAtLeast, canImpersonate, isPrivileged } from '@/lib/roles';

describe('roles utilities', () => {
  it('normalizes role strings', () => {
    expect(normalizeRole('Super Admin')).toBe('super_admin');
    expect(normalizeRole('ADMIN')).toBe('admin');
    expect(normalizeRole('manager')).toBe('manager');
    expect(normalizeRole('anythingElse')).toBe('customer');
  });

  it('permission ordering works', () => {
    expect(hasAtLeast('super admin', 'admin')).toBe(true);
    expect(hasAtLeast('manager', 'admin')).toBe(false);
  });

  it('impersonation matrix enforced', () => {
    expect(canImpersonate('super admin', 'admin')).toBe(true);
    expect(canImpersonate('admin', 'super admin')).toBe(false);
    expect(canImpersonate('admin', 'manager')).toBe(true);
    expect(canImpersonate('manager', 'customer')).toBe(true);
    expect(canImpersonate('manager', 'admin')).toBe(false);
  });

  it('privileged detection', () => {
    expect(isPrivileged('manager')).toBe(true);
    expect(isPrivileged('customer')).toBe(false);
  });
});
