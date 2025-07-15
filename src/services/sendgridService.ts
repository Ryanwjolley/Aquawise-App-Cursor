/**
 * @fileOverview A service for sending emails using SendGrid.
 *
 * - sendEmail - A function to send an email to a given recipient.
 */
import sgMail from '@sendgrid/mail';

const apiKey = process.env.SENDGRID_API_KEY;
const fromEmail = process.env.SENDGRID_FROM_EMAIL;

if (!apiKey || !fromEmail) {
  console.warn(
    'SendGrid credentials are not fully configured in environment variables. Email sending will be disabled.'
  );
} else {
  sgMail.setApiKey(apiKey);
}

interface EmailParams {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Sends an email to a specified recipient.
 * @param params The email parameters.
 * @param params.to The recipient's email address.
 * @param params.subject The subject line of the email.
 * @param params.text The plain text content of the email.
 * @param params.html The HTML content of the email.
 * @returns A promise that resolves when the email is sent.
 */
export async function sendEmail(params: EmailParams): Promise<void> {
  if (!apiKey || !fromEmail) {
    const errorMessage =
      'SendGrid client is not initialized. Please check your environment variables.';
    console.error(errorMessage);
    // For development, log the email to the console instead of sending.
    console.log(`------ EMAIL (DEV) ------\nTO: ${params.to}\nSUBJECT: ${params.subject}\nBODY: ${params.text}\n-------------------------`);
    return;
  }

  const msg = {
    ...params,
    from: fromEmail,
  };

  try {
    await sgMail.send(msg);
    // console.log(`Email sent successfully to ${params.to}`);
  } catch (error) {
    console.error(`Failed to send email to ${params.to}:`, error);
    if (error.response) {
      console.error(error.response.body)
    }
    throw new Error('Failed to send email.');
  }
}
