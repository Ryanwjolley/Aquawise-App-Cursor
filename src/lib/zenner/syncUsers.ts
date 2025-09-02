import { fetchZennerAccounts } from './api';
import { withRetry } from './errors';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export async function syncZennerUsers(companyId: string, opts: { mock?: boolean } = {}) {
  const accounts = await withRetry(() => fetchZennerAccounts(opts), 'fetch accounts');

  // In mock mode, skip Firestore entirely to keep tests/env simple.
  if (opts.mock) {
    return accounts.map(a => a.accountId);
  }

  const { db } = await import('@/firebaseConfig');
  const updated: string[] = [];
  for (const acct of accounts) {
    const userRef = doc(db, 'companies', companyId, 'users', acct.accountId);
    const snap = await getDoc(userRef);
    const base = {
      name: acct.name,
      email: acct.email || `${acct.accountId}@example.com`,
      role: 'Customer',
      companyId,
      updatedAt: Date.now(),
      source: 'zenner'
    };
    await setDoc(userRef, snap.exists() ? { ...snap.data(), ...base } : base, { merge: true });
    updated.push(acct.accountId);
  }
  return updated;
}
