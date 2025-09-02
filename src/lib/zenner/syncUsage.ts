import { fetchZennerReadings } from './api';
import { withRetry } from './errors';
import { sendIntegrationAlert } from './notify';
import { collection, query, where, orderBy, limit, getDocs, addDoc } from 'firebase/firestore';

// Compute delta usage and insert new usage entries
interface UsageSyncOptions { mock?: boolean; maxSpikeFactor?: number; }

export async function syncZennerUsage(companyId: string, opts: UsageSyncOptions = {}) {
  const end = new Date();
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  const readings = await withRetry(() => fetchZennerReadings(start, end, opts), 'fetch readings');

  // Group by account
  const grouped = readings.reduce<Record<string, typeof readings>>((acc, r) => {
    acc[r.accountId] = acc[r.accountId] || [];
    acc[r.accountId].push(r);
    return acc;
  }, {});

  const results: { accountId: string; newUsageGallons: number; }[] = [];

  // In mock mode, just turn readings into simple delta results without Firestore access.
  if (opts.mock) {
    for (const [accountId, list] of Object.entries(grouped)) {
      list.sort((a,b) => a.timestamp.localeCompare(b.timestamp));
      const latest = list[list.length - 1];
      results.push({ accountId, newUsageGallons: latest.readingGallons });
    }
    return results;
  }

  const { db } = await import('@/firebaseConfig');

  for (const [accountId, list] of Object.entries(grouped)) {
    // Sort by timestamp
    list.sort((a,b) => a.timestamp.localeCompare(b.timestamp));
    const latest = list[list.length - 1];

    // Find last stored usage Gallons for this account
    const usageCol = collection(db, 'companies', companyId, 'usageData');
    const qRef = query(usageCol, where('userId', '==', accountId), orderBy('date', 'desc'), limit(1));
    const snap = await getDocs(qRef);
    let lastTotal = 0;
    if (!snap.empty) {
      const docData = snap.docs[0].data() as any;
      lastTotal = docData._cumulative || 0; // track previous cumulative reading if stored
    }

    const newTotal = latest.readingGallons;
    const delta = Math.max(0, newTotal - lastTotal);
    if (delta === 0) continue;

    // Spike detection (basic): if delta > (previous total * factor) and previous total non-zero
    const factor = opts.maxSpikeFactor ?? 3; // configurable
    if (lastTotal > 0 && delta > lastTotal * factor) {
      await sendIntegrationAlert(`Zenner spike ignored for account ${accountId}: delta ${delta} exceeds factor ${factor} * lastTotal ${lastTotal}`);
      continue; // skip storing spike
    }

    await addDoc(usageCol, {
      userId: accountId,
      date: new Date().toISOString().slice(0,10),
      usage: delta, // existing codebase expects 'usage'
      usageGallons: delta,
      source: 'zenner',
      _cumulative: newTotal,
      createdAt: Date.now()
    });
    results.push({ accountId, newUsageGallons: delta });
  }

  return results;
}
