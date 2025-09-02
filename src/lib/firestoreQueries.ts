import { db } from '@/firebaseConfig';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { startTimer } from '@/lib/perf';
import type { UsageEntry, Allocation } from '@/lib/data';
import { parseUsageEntry, parseAllocation } from '@/lib/schemas';

// Fetch usage entries for a user in an optional date range [fromDate, toDate]
export async function getUsageForUserFS(
  companyId: string,
  userId: string,
  fromDate?: string,
  toDate?: string
): Promise<UsageEntry[]> {
  const endTimer = process.env.NODE_ENV === 'development' ? startTimer('getUsageForUserFS') : () => {};
  const col = collection(db, 'companies', companyId, 'usage');
  const constraints: any[] = [where('userId', '==', userId)];
  if (fromDate) constraints.push(where('date', '>=', fromDate));
  if (toDate) constraints.push(where('date', '<=', toDate));
  constraints.push(orderBy('date', 'asc'));
  const snap = await getDocs(query(col, ...constraints as any));
  const res = snap.docs
    .map((d) => parseUsageEntry(d.id, d.data()))
    .filter((v): v is UsageEntry => !!v);
  endTimer({ count: res.length });
  return res;
}

// Fetch allocations applicable to a user (company-wide, group-specific, or user-specific)
export async function getAllocationsForUserFS(
  companyId: string,
  userId: string,
  userGroupId?: string
): Promise<Allocation[]> {
  const col = collection(db, 'companies', companyId, 'allocations');
  // Fetch all then filter client-side to match current data model flexibility
  const snap = await getDocs(query(col, orderBy('startDate', 'desc')));
  const all = snap.docs
    .map((d) => parseAllocation(d.id, d.data()))
    .filter((v): v is Allocation => !!v);
  const applicable = all.filter((a) => {
    if (a.userId) return a.userId === userId;
    if (a.userGroupId && userGroupId) return a.userGroupId === userGroupId;
    return !a.userId && !a.userGroupId; // company-wide
  });
  return applicable.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
}
