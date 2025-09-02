import { NextRequest, NextResponse } from 'next/server';
import { logImpersonationStart } from '@/server/impersonation';
import { getAdminApp } from '@/server/firebaseAdmin';
import { assertImpersonation } from '@/server/rbac';
import { requireAuth } from '@/server/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const auth = await requireAuth(req);
    const { companyId, actorUserId, targetUserId } = body || {};
    if (!companyId || !actorUserId || !targetUserId) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    }
    if (auth.uid !== actorUserId) {
      return NextResponse.json({ error: 'actor_mismatch' }, { status: 403 });
    }
    const db = (await getAdminApp()).firestore();
    const actorSnap = await db.collection('companies').doc(companyId).collection('users').doc(actorUserId).get();
    if (!actorSnap.exists) return NextResponse.json({ error: 'actor_not_found' }, { status: 403 });
    // Validate impersonation and obtain canonical roles (ignore any client-provided role values)
    let roles;
    try {
      roles = await assertImpersonation(companyId, actorUserId, targetUserId);
    } catch (e: any) {
      if (e?.message === 'target_not_found') return NextResponse.json({ error: 'target_not_found' }, { status: 404 });
      if (e?.message === 'forbidden') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      console.error('assertImpersonation error', e);
      return NextResponse.json({ error: 'internal' }, { status: 500 });
    }
    const recId = await logImpersonationStart(companyId, actorUserId, roles.actorRole, targetUserId, roles.targetRole);
    return NextResponse.json({ id: recId });
  } catch (e) {
    console.error('impersonation start failed', e);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
