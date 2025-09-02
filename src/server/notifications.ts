import { getAdminApp } from '@/server/firebaseAdmin';
import { sendEmail, buildNotificationEmailHtml } from '@/server/email';
import { env } from '@/lib/env';

type NewNotification = {
  userId: string;
  message: string;
  details?: string;
  link?: string;
};

export async function addNotificationServer(companyId: string, data: NewNotification) {
  const db = (await getAdminApp()).firestore();
  const ref = db.collection('companies').doc(companyId).collection('notifications').doc();
  await ref.set({
    id: ref.id,
    ...data,
    createdAt: new Date().toISOString(),
    isRead: false,
  });

  // Best-effort email if user has email on file
  try {
    const userSnap = await db.collection('companies').doc(companyId).collection('users').doc(data.userId).get();
    const user = userSnap.data() as any;
    const to = user?.email as string | undefined;
    if (to) {
  const baseUrl = env.PUBLIC_APP_URL || '';
  const html = buildNotificationEmailHtml('AquaWise Notification', data.details || data.message, data.link ? { label: 'View details', href: `${baseUrl}${data.link}` } : undefined);
      await sendEmail({ to, subject: '[AquaWise] Notification', html });
    }
  } catch (e) {
    console.warn('notification email send failed', e);
  }
}




