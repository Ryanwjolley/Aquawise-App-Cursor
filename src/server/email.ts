import sgMail from '@sendgrid/mail';
import { env } from '@/lib/env';

const apiKey = env.SENDGRID_API_KEY;
if (apiKey) {
  sgMail.setApiKey(apiKey);
}

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail({ to, subject, html }: SendEmailInput) {
  if (!apiKey) {
    console.warn('SENDGRID_API_KEY not set; skipping email send');
    return;
  }
  const fromEmail = env.SENDGRID_FROM_EMAIL || 'no-reply@example.com';
  const fromName = env.SENDGRID_FROM_NAME || 'AquaWise';
  const replyTo = env.SENDGRID_REPLY_TO || fromEmail;

  await sgMail.send({
    to,
    from: { email: fromEmail, name: fromName },
    replyTo,
    subject,
    html,
  });
}

export function buildNotificationEmailHtml(title: string, bodyHtml: string, cta?: { label: string; href: string }) {
  const brand = env.SENDGRID_FROM_NAME || 'AquaWise';
  return `
  <div style="font-family: Arial, sans-serif; line-height:1.5; color:#0f172a;">
    <h2 style="margin:0 0 12px 0;">${escapeHtml(title)}</h2>
    <div>${bodyHtml}</div>
    ${cta ? `<p style="margin-top:16px;"><a href="${cta.href}" style="display:inline-block;padding:10px 14px;background:#0ea5e9;color:white;border-radius:6px;text-decoration:none;">${escapeHtml(cta.label)}</a></p>` : ''}
    <p style="margin-top:24px;color:#64748b;font-size:12px;">Sent by ${brand}</p>
  </div>`;
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}




