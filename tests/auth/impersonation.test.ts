import { describe, it, expect } from '@jest/globals';
import { assertImpersonation } from '@/server/rbac';

// We will mock firebase-admin dynamic imports used via getAdminApp()
jest.mock('@/server/firebaseAdmin', () => {
  const users: Record<string, any> = {
    actor1: { customClaims: { role: 'admin' } },
    super1: { customClaims: { role: 'super_admin' } },
    mgr1: { customClaims: { role: 'manager' } },
    cust1: { customClaims: { role: 'customer' } },
  };
  const firestoreData: Record<string, any> = {
    'companies/companyA/users/targetManager': { role: 'manager' },
    'companies/companyA/users/targetCustomer': { role: 'customer' },
  };
  return {
    getAdminApp: async () => ({
      auth: () => ({
        getUser: async (uid: string) => users[uid] || { customClaims: { role: 'customer' } },
      }),
      firestore: () => ({
        collection: (c1: string) => ({
          doc: (d1: string) => ({
            collection: (c2: string) => ({
              doc: (d2: string) => ({
                async get() {
                  const key = `${c1}/${d1}/${c2}/${d2}`;
                  const data = firestoreData[key];
                  return { exists: !!data, data: () => data };
                },
              }),
            }),
          }),
        }),
      }),
    }),
  };
});

describe('assertImpersonation', () => {
  it('allows admin -> manager', async () => {
    const roles = await assertImpersonation('companyA', 'actor1', 'targetManager');
    expect(roles.actorRole).toBe('admin');
    expect(roles.targetRole).toBe('manager');
  });

  it('blocks manager -> admin', async () => {
    await expect(assertImpersonation('companyA', 'mgr1', 'targetManager')).rejects.toThrow('forbidden');
  });

  it('allows super_admin -> customer', async () => {
    const roles = await assertImpersonation('companyA', 'super1', 'targetCustomer');
    expect(roles.actorRole).toBe('super_admin');
    expect(roles.targetRole).toBe('customer');
  });
});
