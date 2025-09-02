import { env } from '@/lib/env';

export interface IrrigationUsageRaw {
  assetId: string;
  timestamp: string; // ISO
  volumeGallons: number;
}

interface FetchOptions { mock?: boolean; }

function base() { return env.IRRIGATION_BASE_URL || 'https://api.irrigation.local'; }
function apiKey() { return env.IRRIGATION_API_KEY || ''; }
function tenant() { return env.IRRIGATION_TENANT || ''; }

export async function fetchIrrigationUsage(start: Date, end: Date, opts: FetchOptions = {}): Promise<IrrigationUsageRaw[]> {
  if (opts.mock) {
    return [
      { assetId: 'asset-1', timestamp: start.toISOString(), volumeGallons: 250 },
      { assetId: 'asset-1', timestamp: end.toISOString(), volumeGallons: 450 },
      { assetId: 'asset-2', timestamp: end.toISOString(), volumeGallons: 300 }
    ];
  }
  const url = `${base()}/usage?tenant=${encodeURIComponent(tenant())}&start=${start.toISOString()}&end=${end.toISOString()}`;
  const resp = await fetch(url, { headers: { 'Authorization': `Bearer ${apiKey()}` } });
  if (!resp.ok) throw new Error(`Irrigation usage fetch failed: ${resp.status}`);
  return await resp.json();
}
