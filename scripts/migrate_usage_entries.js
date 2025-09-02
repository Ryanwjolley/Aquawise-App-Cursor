/* eslint-disable */
require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

function getAdminApp() {
  if (admin.apps.length) return admin.app();
  const hasFileCreds = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const hasInlineCreds = !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL && !!process.env.FIREBASE_ADMIN_PRIVATE_KEY && !!process.env.FIREBASE_ADMIN_PROJECT_ID;
  if (!hasFileCreds && !hasInlineCreds) throw new Error('Admin credentials missing');
  if (hasInlineCreds) {
    let key = process.env.FIREBASE_ADMIN_PRIVATE_KEY || '';
    key = key.replace(/\\n/g, '\n');
    if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) key = key.slice(1, -1);
    admin.initializeApp({ credential: admin.credential.cert({ projectId: process.env.FIREBASE_ADMIN_PROJECT_ID, clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL, privateKey: key }) });
  } else {
    admin.initializeApp();
  }
  return admin.app();
}

async function main() {
  const companyId = process.argv[2] || 'aquawise-app';
  const db = getAdminApp().firestore();

  const srcCol = db.collection('companies').doc(companyId).collection('usageEntries');
  const dstCol = db.collection('companies').doc(companyId).collection('usage');

  const snap = await srcCol.get();
  if (snap.empty) {
    console.log(JSON.stringify({ ok: true, message: 'No usageEntries found', companyId }));
    return;
  }

  let copied = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    // If the destination doc ID scheme is userId_date, prefer that; otherwise keep original ID
    const id = data.userId && data.date ? `${data.userId}_${data.date}` : doc.id;
    await dstCol.doc(id).set({ ...data }, { merge: true });
    copied++;
  }

  console.log(JSON.stringify({ ok: true, companyId, copied }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});




