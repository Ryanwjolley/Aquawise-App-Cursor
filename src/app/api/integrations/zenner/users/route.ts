import { NextResponse } from 'next/server';
import { syncZennerUsers } from '@/lib/zenner/syncUsers';
import { requireRole } from '@/server/auth';

export async function POST(request: Request) {
  try {
  try { await requireRole(request, 'admin'); } catch { return NextResponse.json({ error: 'unauthorized' }, { status: 401 }); }
    const companyId = '0';
    const updated = await syncZennerUsers(companyId, { mock: true });
    return NextResponse.json({ updated: updated.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
