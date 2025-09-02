/* eslint-disable */
require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

function getAdminApp() {
  if (admin.apps.length) return admin.app();

  const hasFileCreds = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const hasInlineCreds = !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL && !!process.env.FIREBASE_ADMIN_PRIVATE_KEY && !!process.env.FIREBASE_ADMIN_PROJECT_ID;

  if (!hasFileCreds && !hasInlineCreds) {
    throw new Error('Admin credentials missing: set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_ADMIN_* env vars');
  }

  if (hasInlineCreds) {
    let key = process.env.FIREBASE_ADMIN_PRIVATE_KEY || '';
    key = key.replace(/\\n/g, '\n');
    if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
      key = key.slice(1, -1);
    }
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: key,
      }),
    });
  } else {
    admin.initializeApp();
  }

  return admin.app();
}

async function main() {
  getAdminApp();
  const auth = admin.auth();
  const db = admin.firestore();

  const companyId = '0';
  const companyRef = db.collection('companies').doc(companyId);
  await companyRef.set(
    {
      name: 'AquaWise',
      defaultUnit: 'gallons',
      userGroupsEnabled: false,
      waterOrdersEnabled: false,
      createdAt: new Date().toISOString(),
    },
    { merge: true }
  );

  const email = 'ryanj@jonesanddemille.com';
  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(email);
  } catch (e) {
    userRecord = await auth.createUser({ email, emailVerified: true, disabled: false });
  }
  await auth.setCustomUserClaims(userRecord.uid, { role: 'super_admin' });

  const userProfileRef = companyRef.collection('users').doc(userRecord.uid);
  await userProfileRef.set(
    {
      id: userRecord.uid,
      name: 'Ryan Jolley',
      email,
      role: 'Super Admin',
      companyId,
      shares: 0,
      createdAt: new Date().toISOString(),
    },
    { merge: true }
  );

  console.log(JSON.stringify({ ok: true, companyId, superAdminUid: userRecord.uid }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


