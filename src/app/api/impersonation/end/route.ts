import { NextRequest, NextResponse } from 'next/server';
import { logImpersonationEnd } from '@/server/impersonation';
import { requireAuth } from '@/server/auth';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const body = await req.json();
    const { companyId, recordId, actorUserId } = body || {};
    if (!companyId || !recordId) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    }
    if (actorUserId && actorUserId !== auth.uid) {
      return NextResponse.json({ error: 'actor_mismatch' }, { status: 403 });
    }
    await logImpersonationEnd(companyId, recordId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('impersonation end failed', e);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
