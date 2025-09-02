import { getAdminApp } from '@/server/firebaseAdmin';
import { normalizeRole, hasAtLeast } from '@/lib/roles';

export interface AuthContext {
  uid: string;
  role?: string;
}

// Extract bearer token from Authorization header value
function extractBearer(authHeader?: string | null): string | null {
  if (!authHeader) return null;
  const m = authHeader.match(/^Bearer (.+)$/i);
  return m ? m[1] : null;
}

export async function verifyRequestAuth(req: Request): Promise<AuthContext | null> {
  try {
    const header = req.headers.get('authorization');
    const token = extractBearer(header);
    if (!token) return null;
    const admin = await getAdminApp();
    const decoded = await admin.auth().verifyIdToken(token, true);
    return { uid: decoded.uid, role: (decoded as any).role };
  } catch {
    return null;
  }
}

export async function requireAuth(req: Request): Promise<AuthContext> {
  const ctx = await verifyRequestAuth(req);
  if (!ctx) throw new Error('unauthorized');
  return ctx;
}

export async function requireRole(req: Request, minRole: 'manager' | 'admin' | 'super_admin') {
  const ctx = await requireAuth(req);
  const role = normalizeRole(ctx.role);
  if (!hasAtLeast(role, minRole)) throw new Error('forbidden');
  return { ...ctx, role };
}
