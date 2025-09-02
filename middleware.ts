import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminApp } from '@/server/firebaseAdmin';
import { normalizeRole, hasAtLeast } from '@/lib/roles';

// Expect frontend to set a cookie 'auth_token' with Firebase ID token after login (future improvement).
// For now, middleware is permissive if no token present (so local dev not blocked); it will just let request pass.
// Once client sets the cookie, this will enforce server-side redirects.

async function verifyToken(idToken: string) {
  try {
    const admin = await getAdminApp();
    const decoded = await admin.auth().verifyIdToken(idToken, true);
    return decoded as any;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const needsAdmin = pathname.startsWith('/admin');
  const needsSuper = pathname.startsWith('/super-admin');
  if (!needsAdmin && !needsSuper) return NextResponse.next();

  const token = req.cookies.get('auth_token')?.value;
  if (!token) return NextResponse.next(); // soft mode until cookie issuance implemented

  const decoded = await verifyToken(token);
  if (!decoded) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  const role = normalizeRole((decoded as any).role);
  if (needsSuper && role !== 'super_admin') {
    const url = req.nextUrl.clone();
    url.pathname = '/admin';
    return NextResponse.redirect(url);
  }
  if (needsAdmin && !hasAtLeast(role, 'manager')) { // require at least manager
    const url = req.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/super-admin/:path*'],
};
