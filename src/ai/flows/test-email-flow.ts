'use server';
/**
 * @fileOverview A flow to test the SendGrid email service.
 */

import { ai } from '@/ai/genkit';
import { sendEmail } from '@/services/sendgridService';
import { z } from 'zod';

export const testEmailFlow = ai.defineFlow(
  {
    name: 'testEmailFlow',
    inputSchema: z.undefined(),
    outputSchema: z.string(),
  },
  async () => {
    console.log('Attempting to send a test email...');

    try {
      await sendEmail({
        // IMPORTANT: Change this to your own email to receive the test.
        to: 'test@example.com',
        subject: 'AquaWise - SendGrid Test',
        text: 'If you are seeing this, your SendGrid configuration is working!',
        html: '<strong>If you are seeing this, your SendGrid configuration is working!</strong>',
      });
      console.log('Test email sent successfully.');
      return 'Test email sent successfully. Please check your inbox.';
    } catch (error) {
      console.error('Failed to send test email:', error);
      throw new Error(
        'Failed to send test email. Please check your SendGrid credentials in the .env file and the server logs for more details.'
      );
    }
  }
);
