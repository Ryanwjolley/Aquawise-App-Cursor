"use server";

import { getAdminApp } from '@/server/firebaseAdmin';
import type { WaterOrder } from '@/lib/data';
import { assertCompanyRole } from '@/server/rbac';
import { differenceInHours } from 'date-fns';
import { addNotificationServer } from '@/server/notifications';

export async function addWaterOrderAction(companyId: string, data: Omit<WaterOrder, 'id' | 'status' | 'createdAt'>, actorUserId: string) {
  await assertCompanyRole(companyId, actorUserId, ['admin', 'manager', 'super_admin']);
  const db = (await getAdminApp()).firestore();
  const ref = db.collection('companies').doc(companyId).collection('waterOrders').doc();
  await ref.set({ ...data, id: ref.id, companyId, status: 'pending', createdAt: new Date().toISOString() });
}

export async function updateWaterOrderStatusAction(companyId: string, id: string, status: 'approved' | 'rejected' | 'completed', actorUserId: string, notes?: string) {
  await assertCompanyRole(companyId, actorUserId, ['admin', 'manager', 'super_admin']);
  const db = (await getAdminApp()).firestore();
  await db.collection('companies').doc(companyId).collection('waterOrders').doc(id).set({ status, reviewedBy: actorUserId, reviewedAt: new Date().toISOString(), adminNotes: notes }, { merge: true });

  // Create a notification for the order owner
  const orderSnap = await db.collection('companies').doc(companyId).collection('waterOrders').doc(id).get();
  const order: any = orderSnap.data() || {};
  if (order?.userId) {
    const message = status === 'approved'
      ? 'Your water order was approved.'
      : status === 'rejected'
      ? `Your water order was rejected${notes ? `: ${notes}` : ''}`
      : 'Your water order has been completed.';
    await addNotificationServer(companyId, { userId: order.userId, message, details: notes, link: '/water-orders' });
  }
}

export async function submitWaterOrderAction(companyId: string, data: Omit<WaterOrder, 'id' | 'status' | 'createdAt' | 'companyId'>, actorUserId: string) {
  const db = (await getAdminApp()).firestore();
  // Verify actor exists in company
  const actorSnap = await db.collection('companies').doc(companyId).collection('users').doc(actorUserId).get();
  if (!actorSnap.exists) throw new Error('forbidden');
  const ref = db.collection('companies').doc(companyId).collection('waterOrders').doc();
  await ref.set({ ...data, id: ref.id, companyId, status: 'pending', createdAt: new Date().toISOString() });
}

export async function checkOrderAvailabilityAction(companyId: string, startDateISO: string, endDateISO: string, totalGallons: number): Promise<{ ok: boolean }> {
  const db = (await getAdminApp()).firestore();
  const start = new Date(startDateISO);
  const end = new Date(endDateISO);
  const totalHours = Math.max(1, differenceInHours(end, start) || 1);
  const requestedPerHour = totalGallons / totalHours;

  const availsSnap = await db.collection('companies').doc(companyId).collection('waterAvailabilities').get();
  const avails = availsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

  const ordersSnap = await db.collection('companies').doc(companyId).collection('waterOrders').get();
  const orders = ordersSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as WaterOrder[];

  // Helper: compute per-hour allocation for a period
  function perHourForPeriod(pStartISO: string, pEndISO: string, total: number): number {
    const ps = new Date(pStartISO);
    const pe = new Date(pEndISO);
    const hours = Math.max(1, differenceInHours(pe, ps) || 1);
    return total / hours;
  }

  for (let t = new Date(start); t < end; t.setHours(t.getHours() + 1)) {
    const hourStart = new Date(t);
    const hourEnd = new Date(t);
    hourEnd.setHours(hourEnd.getHours() + 1);

    // Capacity this hour
    let capacity = 0;
    for (const a of avails) {
      const aStart = new Date(a.startDate);
      const aEnd = new Date(a.endDate);
      if (hourStart < aEnd && hourEnd > aStart) {
        capacity += perHourForPeriod(a.startDate, a.endDate, a.gallons);
      }
    }

    // Existing demand this hour (approved or completed)
    let demand = 0;
    for (const o of orders) {
      if (o.status !== 'approved' && o.status !== 'completed') continue;
      const oStart = new Date(o.startDate);
      const oEnd = new Date(o.endDate);
      if (hourStart < oEnd && hourEnd > oStart) {
        demand += perHourForPeriod(o.startDate, o.endDate, o.totalGallons);
      }
    }

    if (demand + requestedPerHour > capacity + 1e-6) {
      return { ok: false };
    }
  }

  return { ok: true };
}


