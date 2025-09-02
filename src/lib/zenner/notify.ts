import { sendEmail } from '@/server/email';

// Simple wrapper that could be expanded for multi-channel notifications
export async function sendIntegrationAlert(message: string) {
  try {
    // Hardcoded recipient(s) for now; could load from Firestore company doc
    const to = process.env.SUPER_ADMIN_EMAIL || 'admin@example.com';
    await sendEmail({
      to,
      subject: 'Zenner Integration Alert',
      html: `<p>${message}</p>`
    });
  } catch (e) {
    console.error('Failed to send integration alert email', e);
  }
}
