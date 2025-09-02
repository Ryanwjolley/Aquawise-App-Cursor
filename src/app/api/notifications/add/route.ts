import { NextResponse } from 'next/server';
import { addNotificationServer } from '@/server/notifications';
import { requireAuth } from '@/server/auth';

// Bulk-add notifications (server-only).
// Body: { companyId: string, notifications: Array<{ userId: string; message: string; details?: string; link?: string; }> }
export async function POST(req: Request) {
  try {
  await requireAuth(req); // basic auth gate (role checks can be added later)
  const body = await req.json();
    const { companyId, notifications } = body || {};
    if (!companyId || !Array.isArray(notifications)) {
      return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
    }
    for (const n of notifications) {
      if (!n?.userId || !n?.message) continue;
      await addNotificationServer(companyId, {
        userId: n.userId,
        message: n.message,
        details: n.details,
        link: n.link,
      });
    }
    return NextResponse.json({ ok: true, count: notifications.length });
  } catch (e) {
    console.error('Notification add failed', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
