import { NextResponse } from 'next/server';
import { syncIrrigationUsage } from '@/lib/irrigation/syncUsage';
import { requireRole } from '@/server/auth';

export async function POST(request: Request) {
  try {
    try { await requireRole(request, 'admin'); } catch { return NextResponse.json({ error: 'unauthorized' }, { status: 401 }); }
    const companyId = 'pilotCo1';
    const mock = true; // keep mock for manual UI until live creds verified
    const results = await syncIrrigationUsage(companyId, { mock });
    return NextResponse.json({ inserted: results.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
