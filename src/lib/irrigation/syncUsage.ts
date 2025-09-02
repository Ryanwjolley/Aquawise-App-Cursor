import { fetchIrrigationUsage } from './api';
import { collection, getDocs, query, where, orderBy, limit, addDoc } from 'firebase/firestore';

interface UsageSyncOptions { mock?: boolean; maxSpikeFactor?: number; }

// Similar pattern to Zenner but generalized for irrigation provider.
export async function syncIrrigationUsage(companyId: string, opts: UsageSyncOptions = {}) {
  const end = new Date();
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  const readings = await fetchIrrigationUsage(start, end, opts);

  // Group by asset
  const grouped = readings.reduce<Record<string, typeof readings>>((acc, r) => {
    (acc[r.assetId] ||= []).push(r);
    return acc;
  }, {});

  const results: { assetId: string; newUsageGallons: number; }[] = [];

  if (opts.mock) {
    for (const [assetId, list] of Object.entries(grouped)) {
      list.sort((a,b) => a.timestamp.localeCompare(b.timestamp));
      const latest = list[list.length - 1];
      results.push({ assetId, newUsageGallons: latest.volumeGallons });
    }
    return results;
  }

  const { db } = await import('@/firebaseConfig');
  for (const [assetId, list] of Object.entries(grouped)) {
    list.sort((a,b) => a.timestamp.localeCompare(b.timestamp));
    const latest = list[list.length - 1];

    const usageCol = collection(db, 'companies', companyId, 'usageData');
    const qRef = query(usageCol, where('userId', '==', assetId), orderBy('date', 'desc'), limit(1));
    const snap = await getDocs(qRef);
    let lastTotal = 0;
    if (!snap.empty) {
      const docData = snap.docs[0].data() as any;
      lastTotal = docData._cumulative || 0;
    }

    const newTotal = latest.volumeGallons;
    const delta = Math.max(0, newTotal - lastTotal);
    if (delta === 0) continue;

    const factor = opts.maxSpikeFactor ?? 3;
    if (lastTotal > 0 && delta > lastTotal * factor) {
      console.warn(`Irrigation spike ignored for asset ${assetId}: delta ${delta} > factor ${factor} * lastTotal ${lastTotal}`);
      continue;
    }

    await addDoc(usageCol, {
      userId: assetId,
      date: new Date().toISOString().slice(0,10),
      usage: delta,
      usageGallons: delta,
      source: 'irrigation',
      _cumulative: newTotal,
      createdAt: Date.now()
    });

    results.push({ assetId, newUsageGallons: delta });
  }

  return results;
}
