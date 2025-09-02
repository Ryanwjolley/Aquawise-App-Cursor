"use server";

import { getAdminApp } from '@/server/firebaseAdmin';
import { assertCompanyRole } from '@/server/rbac';
import { sendEmail } from '@/server/email';
import type { User } from '@/lib/data';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9010';

export async function addUserAction(companyId: string, data: Omit<User, 'id' | 'companyId'>, actorUserId?: string) {
  if (actorUserId) await assertCompanyRole(companyId, actorUserId, ['admin', 'super_admin']);
  const adminApp = await getAdminApp();
  const db = adminApp.firestore();
  const auth = adminApp.auth();

  // Ensure Auth user exists
  let authUser;
  try {
    authUser = await auth.getUserByEmail(data.email);
  } catch {
    authUser = await auth.createUser({ email: data.email, emailVerified: false, disabled: false });
  }

  // Optional: set role claim for admins/managers
  const roleLower = (data.role || '').toLowerCase();
  if (roleLower.includes('admin') || roleLower.includes('manager') || roleLower.includes('super')) {
    await auth.setCustomUserClaims(authUser.uid, { role: roleLower.includes('super') ? 'super_admin' : roleLower.includes('manager') ? 'manager' : 'admin' });
  }

  // Create profile doc
  const docRef = db.collection('companies').doc(companyId).collection('users').doc(authUser.uid);
  await docRef.set({ ...data, id: authUser.uid, companyId, createdAt: new Date().toISOString() }, { merge: true });

  // Send email link invite (requires Email Link sign-in enabled)
  try {
    const actionCodeSettings = { url: `${APP_URL}/login`, handleCodeInApp: true } as any;
    const link = await auth.generateSignInWithEmailLink(data.email, actionCodeSettings);
    await sendEmail({
      to: data.email,
      subject: 'You have been invited to AquaWise',
      html: `<p>Hello ${data.name || ''},</p><p>You have been invited to AquaWise. Click the link below to sign in:</p><p><a href="${link}">Complete sign-in</a></p>`,
    });
  } catch (e) {
    // Non-fatal if email provider not fully configured in dev
    console.warn('Invite email failed:', e);
  }

  return { id: authUser.uid };
}

export async function updateUserAction(companyId: string, id: string, data: Partial<User>, actorUserId?: string) {
  if (actorUserId) await assertCompanyRole(companyId, actorUserId, ['admin', 'manager', 'super_admin']);
  const db = (await getAdminApp()).firestore();
  await db.collection('companies').doc(companyId).collection('users').doc(id).set({ ...data, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function deleteUserAction(companyId: string, id: string, actorUserId?: string) {
  if (actorUserId) await assertCompanyRole(companyId, actorUserId, ['admin', 'super_admin']);
  const db = (await getAdminApp()).firestore();
  await db.collection('companies').doc(companyId).collection('users').doc(id).delete();
}


