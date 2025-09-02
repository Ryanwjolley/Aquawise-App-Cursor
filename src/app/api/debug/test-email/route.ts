import { NextResponse } from 'next/server';
import { sendEmail } from '@/server/email';
import { requireRole } from '@/server/auth';

// TEMPORARY: Test email route to verify SendGrid integration.
// Remove after verification or protect with auth/role checks.
export async function POST(request: Request) {
  try {
  try { await requireRole(request, 'super_admin'); } catch { return NextResponse.json({ error: 'unauthorized' }, { status: 401 }); }
    const body = await request.json().catch(() => ({}));
    const to = body.to || process.env.SUPER_ADMIN_EMAIL || process.env.SENDGRID_FROM_EMAIL;
    if (!to) {
      return NextResponse.json({ error: 'No recipient (to) provided and no SUPER_ADMIN_EMAIL configured.' }, { status: 400 });
    }
    const subject = body.subject || 'AquaWise Test Email';
    const html = body.html || '<p>This is a test email from AquaWise.</p>';
    await sendEmail({ to, subject, html });
    return NextResponse.json({ ok: true, to, subject });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
