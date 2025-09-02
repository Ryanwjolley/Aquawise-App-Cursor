import assert from 'node:assert';

// Dynamic lazy import to avoid bundling firebase-admin into client builds.
let appPromise: Promise<import('firebase-admin').app.App> | undefined;

async function initApp() {
  const admin = await import('firebase-admin');
  if (admin.apps?.length) return admin.app();
  const hasFileCreds = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const hasInlineCreds = !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL && !!process.env.FIREBASE_ADMIN_PRIVATE_KEY && !!process.env.FIREBASE_ADMIN_PROJECT_ID;
  assert(hasFileCreds || hasInlineCreds, 'Firebase admin credentials are not configured.');
  if (hasInlineCreds) {
    const raw = process.env.FIREBASE_ADMIN_PRIVATE_KEY || '';
    let cleaned = raw.replace(/\\n/g, '\n');
    if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
      cleaned = cleaned.slice(1, -1);
    }
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: cleaned,
      }),
    });
  }
  return admin.initializeApp();
}

export async function getAdminApp() {
  if (!appPromise) appPromise = initApp();
  return appPromise;
}

export async function getAdminAuth() {
  const admin = await import('firebase-admin');
  return (await getAdminApp()).auth();
}

export async function getAdminDb() {
  const { getFirestore } = await import('firebase-admin/firestore');
  return getFirestore(await getAdminApp());
}


