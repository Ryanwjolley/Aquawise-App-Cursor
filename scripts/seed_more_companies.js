/* eslint-disable */
// Seeds THREE additional companies with users, allocations, and daily usage.
// Does NOT touch company '0'.

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

function isoDate(y, m, d) {
  return new Date(y, m, d).toISOString();
}

function daysBetween(startISO, endISO) {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((end - start) / msPerDay) + 1;
}

async function seedCompany(db, def) {
  const { id: companyId, name, users, groups, allocations } = def;

  // Company doc
  await upsertDoc(db.collection('companies').doc(companyId), {
    id: companyId,
    name,
    defaultUnit: 'gallons',
    userGroupsEnabled: true,
    waterOrdersEnabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Groups
  for (const g of groups) {
    await upsertDoc(db.collection('companies').doc(companyId).collection('userGroups').doc(g.id), {
      id: g.id,
      name: g.name,
      companyId,
      createdAt: new Date().toISOString(),
    });
  }

  // Users
  for (const u of users) {
    await upsertDoc(db.collection('companies').doc(companyId).collection('users').doc(u.id), {
      ...u,
      companyId,
      createdAt: new Date().toISOString(),
    });
  }

  // Allocations
  for (const a of allocations) {
    await upsertDoc(db.collection('companies').doc(companyId).collection('allocations').doc(a.id), {
      ...a,
      companyId,
      createdAt: new Date().toISOString(),
    });
  }

  // Usage: generate daily usage within allocation windows for customers
  const customers = users.filter((u) => (u.role || '').toLowerCase().includes('customer'));
  const allUsersById = new Map(users.map((u) => [u.id, u]));

  for (const alloc of allocations) {
    const start = new Date(alloc.startDate);
    const end = new Date(alloc.endDate);
    const totalDays = daysBetween(alloc.startDate, alloc.endDate);
    const dailyGallons = alloc.gallons / Math.max(totalDays, 1);

    // Determine who the allocation applies to
    let relevantUsers = customers;
    if (alloc.userId) {
      relevantUsers = [allUsersById.get(alloc.userId)].filter(Boolean);
    } else if (alloc.userGroupId) {
      relevantUsers = customers.filter((u) => u.userGroupId === alloc.userGroupId);
    }
    if (relevantUsers.length === 0) continue;

    const totalShares = relevantUsers.reduce((sum, u) => sum + (u.shares || 1), 0);

    const cursor = new Date(start);
    while (cursor <= end) {
      for (const u of relevantUsers) {
        const share = (u.shares || 1) / totalShares;
        const base = dailyGallons * share;
        const factor = 0.85 + Math.random() * 0.3; // +/-15%
        const gallons = Math.round(base * factor);
        const dateKey = cursor.toISOString().slice(0, 10);
        const docId = `${u.id}_${dateKey}`;
        await upsertDoc(db.collection('companies').doc(companyId).collection('usage').doc(docId), {
          userId: u.id,
          date: dateKey,
          usage: gallons,
        });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }
}

async function main() {
  getAdminApp();
  const db = admin.firestore();

  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const monthStart = new Date(y, m, 1).toISOString();
  const mid = new Date(y, m, 15).toISOString();
  const monthEnd = new Date(y, m + 1, 0).toISOString();

  // Define three companies
  const companies = [
    {
      id: 'gva',
      name: 'Golden Valley Agriculture',
      groups: [
        { id: 'north', name: 'North Fields' },
        { id: 'south', name: 'South Fields' },
      ],
      users: [
        { id: 'gva-admin', name: 'Alice Johnson', email: 'alice@gva.com', role: 'Admin & Customer', shares: 60, notificationPreference: 'email', userGroupId: 'north' },
        { id: 'gva-bob', name: 'Bob Williams', email: 'bob@gva.com', role: 'Customer', shares: 20, notificationPreference: 'email', userGroupId: 'north' },
        { id: 'gva-cara', name: 'Cara Mills', email: 'cara@gva.com', role: 'Customer', shares: 20, notificationPreference: 'mobile', userGroupId: 'south' },
      ],
      allocations: [
        { id: 'gva-alloc-1', startDate: monthStart, endDate: mid, gallons: 900000 },
        { id: 'gva-alloc-2', startDate: mid, endDate: monthEnd, gallons: 600000, userGroupId: 'north' },
      ],
    },
    {
      id: 'sunrise',
      name: 'Sunrise Farms',
      groups: [
        { id: 'orchard', name: 'Orchard' },
        { id: 'vineyard', name: 'Vineyard' },
      ],
      users: [
        { id: 'sf-admin', name: 'Diana Miller', email: 'diana@sunrise.com', role: 'Admin', shares: 50, notificationPreference: 'email', userGroupId: 'orchard' },
        { id: 'sf-evan', name: 'Evan Davis', email: 'evan@sunrise.com', role: 'Customer', shares: 30, notificationPreference: 'email', userGroupId: 'vineyard' },
        { id: 'sf-fiona', name: 'Fiona White', email: 'fiona@sunrise.com', role: 'Customer', shares: 20, notificationPreference: 'mobile', userGroupId: 'orchard' },
      ],
      allocations: [
        { id: 'sf-alloc-1', startDate: monthStart, endDate: monthEnd, gallons: 320000 },
        { id: 'sf-alloc-2', startDate: monthStart, endDate: mid, gallons: 80000, userId: 'sf-evan' },
      ],
    },
    {
      id: 'pvo',
      name: 'Pleasant View Orchards',
      groups: [
        { id: 'well-5', name: 'Well 5' },
      ],
      users: [
        { id: 'pvo-admin', name: 'George Harris', email: 'george@pvo.com', role: 'Admin & Customer', shares: 100, notificationPreference: 'email', userGroupId: 'well-5' },
        { id: 'pvo-hannah', name: 'Hannah Martin', email: 'hannah@pvo.com', role: 'Customer', shares: 80, notificationPreference: 'email', userGroupId: 'well-5' },
      ],
      allocations: [
        { id: 'pvo-alloc-1', startDate: monthStart, endDate: monthEnd, gallons: 1200000, userGroupId: 'well-5' },
      ],
    },
  ];

  for (const c of companies) {
    await seedCompany(db, c);
  }

  console.log(JSON.stringify({ ok: true, companies: companies.map((c) => c.id) }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});




