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

async function upsertDoc(ref, data) {
  await ref.set(data, { merge: true });
}

async function main() {
  const companyId = '0';
  const app = getAdminApp();
  const db = app.firestore();

  // Ensure company exists
  await upsertDoc(db.collection('companies').doc(companyId), {
    id: companyId,
    name: 'AquaWise',
    defaultUnit: 'gallons',
    userGroupsEnabled: true,
    waterOrdersEnabled: true,
    updatedAt: new Date().toISOString(),
  });

  // User Groups
  const groups = [
    { id: 'group-north', name: 'Northern Fields' },
    { id: 'group-south', name: 'Southern Fields' },
  ];
  for (const g of groups) {
    await upsertDoc(db.collection('companies').doc(companyId).collection('userGroups').doc(g.id), {
      id: g.id,
      name: g.name,
      companyId,
      createdAt: new Date().toISOString(),
    });
  }

  // Users (besides seeded super admin)
  const users = [
    { id: 'u-alice', name: 'Alice Johnson', email: 'alice@example.com', role: 'Admin & Customer', shares: 50, notificationPreference: 'email', userGroupId: 'group-north' },
    { id: 'u-bob', name: 'Bob Williams', email: 'bob@example.com', role: 'Customer', shares: 15, notificationPreference: 'email', userGroupId: 'group-north' },
    { id: 'u-cara', name: 'Cara Mills', email: 'cara@example.com', role: 'Customer', shares: 20, notificationPreference: 'mobile', userGroupId: 'group-south' },
  ];
  for (const u of users) {
    await upsertDoc(db.collection('companies').doc(companyId).collection('users').doc(u.id), {
      ...u,
      companyId,
      createdAt: new Date().toISOString(),
    });
  }

  // Allocations (company-wide and group-specific)
  const now = new Date();
  const start1 = new Date(now.getFullYear(), now.getMonth(), 1);
  const end1 = new Date(now.getFullYear(), now.getMonth(), 15);
  const start2 = new Date(now.getFullYear(), now.getMonth(), 16);
  const end2 = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const allocations = [
    { id: 'alloc-company-1', startDate: start1.toISOString(), endDate: end1.toISOString(), gallons: 800000 },
    { id: 'alloc-north-1', startDate: start2.toISOString(), endDate: end2.toISOString(), gallons: 500000, userGroupId: 'group-north' },
  ];
  for (const a of allocations) {
    await upsertDoc(db.collection('companies').doc(companyId).collection('allocations').doc(a.id), {
      ...a,
      companyId,
      createdAt: new Date().toISOString(),
    });
  }

  // Availability (system capacity over a month)
  const avStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const avEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  await upsertDoc(db.collection('companies').doc(companyId).collection('waterAvailabilities').doc('avail-1'), {
    id: 'avail-1',
    companyId,
    startDate: avStart.toISOString(),
    endDate: avEnd.toISOString(),
    gallons: 2500000,
    createdAt: new Date().toISOString(),
  });

  // Orders (pending + approved)
  const ordStart1 = new Date(now.getFullYear(), now.getMonth(), Math.min(10, end1.getDate()));
  const ordEnd1 = new Date(ordStart1.getFullYear(), ordStart1.getMonth(), ordStart1.getDate(), 16);
  const ordStart2 = new Date(now.getFullYear(), now.getMonth(), Math.min(18, end2.getDate()));
  const ordEnd2 = new Date(ordStart2.getFullYear(), ordStart2.getMonth(), ordStart2.getDate(), 14);
  const orders = [
    { id: 'wo-1', userId: 'u-bob', startDate: ordStart1.toISOString(), endDate: ordEnd1.toISOString(), amount: 2, unit: 'cfs', totalGallons: 2 * 7.48051948 * 3600 * (16), status: 'pending' },
    { id: 'wo-2', userId: 'u-cara', startDate: ordStart2.toISOString(), endDate: ordEnd2.toISOString(), amount: 500, unit: 'gpm', totalGallons: 500 * 60 * (14), status: 'approved' },
  ];
  for (const o of orders) {
    await upsertDoc(db.collection('companies').doc(companyId).collection('waterOrders').doc(o.id), {
      ...o,
      companyId,
      createdAt: new Date().toISOString(),
    });
  }

  // Usage (a couple of recent entries for dashboard)
  const usageEntries = [
    { userId: 'u-alice', date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2).toISOString().slice(0, 10), usage: 4500 },
    { userId: 'u-alice', date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString().slice(0, 10), usage: 5200 },
    { userId: 'u-bob', date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString().slice(0, 10), usage: 3200 },
  ];
  for (const u of usageEntries) {
    const docId = `${u.userId}_${u.date}`;
    await upsertDoc(db.collection('companies').doc(companyId).collection('usage').doc(docId), u);
  }

  console.log(JSON.stringify({ ok: true, seeded: { groups: groups.length, users: users.length, allocations: allocations.length, availability: 1, orders: orders.length, usage: usageEntries.length } }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


