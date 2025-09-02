/* eslint-disable */
// Pilot seeding script: creates a minimal single-company dataset for guided pilot testing.
// Usage: npm run seed:pilot  (ensure .env.local has FIREBASE_ADMIN_* or GOOGLE_APPLICATION_CREDENTIALS set)

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

async function upsert(ref, data) { await ref.set(data, { merge: true }); }

function isoDate(d) { return d.toISOString().slice(0,10); }

async function main() {
  const companyId = process.argv[2] || 'pilotCo1';
  const app = getAdminApp();
  const db = app.firestore();
  const auth = app.auth();

  const now = new Date();

  // 1. Company doc
  await upsert(db.collection('companies').doc(companyId), {
    id: companyId,
    name: 'Pilot Company',
    defaultUnit: 'gallons',
    userGroupsEnabled: false,
    waterOrdersEnabled: true,
    createdAt: new Date().toISOString(),
  });

  // 2. Users + optional claim roles (super_admin may be outside this company)
  const userDefs = [
    { key: 'admin01', role: 'Admin', email: process.env.PILOT_ADMIN_EMAIL || 'pilot-admin@example.com', name: 'Alice Admin' },
    { key: 'manager01', role: 'Manager', email: process.env.PILOT_MANAGER_EMAIL || 'pilot-manager@example.com', name: 'Mark Manager' },
    { key: 'customerHigh', role: 'Customer', email: process.env.PILOT_CUSTOMER_HIGH_EMAIL || 'high@example.com', name: 'Hannah High', shares: 10 },
    { key: 'customerLow', role: 'Customer', email: process.env.PILOT_CUSTOMER_LOW_EMAIL || 'low@example.com', name: 'Liam Low', shares: 3 },
    { key: 'orphanCustomer', role: 'Customer', email: process.env.PILOT_ORPHAN_EMAIL || 'orphan@example.com', name: 'Orphan User' },
  ];

  const userResults = [];
  for (const u of userDefs) {
    let authUser;
    try { authUser = await auth.getUserByEmail(u.email); } catch { authUser = await auth.createUser({ email: u.email, emailVerified: true, disabled: false }); }
    // Set a simple custom claim only if admin/manager – (super_admin assumed seeded separately)
    if (/admin/i.test(u.role) || /manager/i.test(u.role)) {
      await auth.setCustomUserClaims(authUser.uid, { role: u.role.toLowerCase().replace(/ /g,'_') });
    }
    await upsert(db.collection('companies').doc(companyId).collection('users').doc(authUser.uid), {
      id: authUser.uid,
      name: u.name,
      email: u.email,
      role: u.role,
      companyId,
      shares: u.shares || 0,
      createdAt: new Date().toISOString(),
    });
    userResults.push({ email: u.email, uid: authUser.uid, role: u.role });
  }

  // 3. Allocation (single active window ~30 days)
  const allocStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 5);
  const allocEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 25);
  await upsert(db.collection('companies').doc(companyId).collection('allocations').doc('alloc-main'), {
    id: 'alloc-main', companyId, startDate: allocStart.toISOString(), endDate: allocEnd.toISOString(), gallons: 100000, createdAt: new Date().toISOString(),
  });

  // 4. Availability summary
  await upsert(db.collection('companies').doc(companyId).collection('waterAvailabilities').doc('avail-main'), {
    id: 'avail-main', companyId, startDate: allocStart.toISOString(), endDate: allocEnd.toISOString(), gallons: 500000, createdAt: new Date().toISOString(),
  });

  // 5. Usage (7 consecutive days for high customer)
  const highUser = userResults.find(u => u.email === (process.env.PILOT_CUSTOMER_HIGH_EMAIL || 'high@example.com'));
  if (highUser) {
    let cumulative = 0;
    for (let i=7; i>=1; i--) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const usage = 100 + Math.floor(Math.random()*50); // 100-149
      cumulative += usage;
      const docId = `${highUser.uid}_${isoDate(day)}`;
      await upsert(db.collection('companies').doc(companyId).collection('usage').doc(docId), {
        userId: highUser.uid,
        date: isoDate(day),
        usage,
        cumulative,
      });
    }
  }

  // 6. Notifications (2 unread to high user)
  const highUserId = highUser?.uid;
  if (highUserId) {
    await upsert(db.collection('companies').doc(companyId).collection('notifications').doc('pilot-welcome'), {
      id: 'pilot-welcome', userId: highUserId, message: 'Welcome to the pilot', createdAt: new Date().toISOString(), isRead: false,
    });
    await upsert(db.collection('companies').doc(companyId).collection('notifications').doc('pilot-checkin'), {
      id: 'pilot-checkin', userId: highUserId, message: 'Daily check-in reminder', createdAt: new Date().toISOString(), isRead: false,
    });
  }

  console.log(JSON.stringify({ ok: true, companyId, users: userResults.length }));
}

main().catch(e => { console.error(e); process.exit(1); });
