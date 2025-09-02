import { NextResponse } from 'next/server';
import { syncZennerUsage } from '@/lib/zenner/syncUsage';
import { requireRole } from '@/server/auth';

export async function POST(request: Request) {
  try {
  try { await requireRole(request, 'admin'); } catch { return NextResponse.json({ error: 'unauthorized' }, { status: 401 }); }
    const companyId = '0'; // super admin company for now
    const results = await syncZennerUsage(companyId, { mock: true });
    return NextResponse.json({ inserted: results.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
