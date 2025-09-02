import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/server/firebaseAdmin';

// Establish or refresh an authenticated session cookie from a Firebase ID token supplied by the client after sign-in.
// POST body: { idToken: string }
export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json().catch(() => ({}));
    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json({ error: 'missing_token' }, { status: 400 });
    }
    const admin = await getAdminApp();
    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(idToken, true);
    } catch {
      return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
    }
    const exp = decoded.exp ? decoded.exp * 1000 : Date.now() + 60 * 60 * 1000;
    const maxAgeSeconds = Math.max(60, Math.floor((exp - Date.now()) / 1000));
    const res = NextResponse.json({ ok: true, uid: decoded.uid });
    res.cookies.set('auth_token', idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: maxAgeSeconds,
    });
    return res;
  } catch (e) {
    console.error('session establish failed', e);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}

// DELETE clears the cookie
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set('auth_token', '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}