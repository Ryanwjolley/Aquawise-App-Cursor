/**
 * @fileOverview A service for sending SMS messages using Twilio.
 *
 * - sendSms - A function to send an SMS message to a given phone number.
 */
import {Twilio} from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !twilioPhoneNumber) {
  console.warn(
    'Twilio credentials are not fully configured in environment variables. SMS sending will be disabled.'
  );
}

const client =
  accountSid && authToken ? new Twilio(accountSid, authToken) : null;

/**
 * Sends an SMS message to a specified phone number.
 * @param to The recipient's phone number (e.g., '+15558675309').
 * @param body The content of the SMS message.
 * @returns A promise that resolves when the message is sent.
 */
export async function sendSms(to: string, body: string): Promise<void> {
  if (!client) {
    const errorMessage =
      'Twilio client is not initialized. Please check your environment variables.';
    console.error(errorMessage);
    // In a real app, you might want to throw an error or handle this case more gracefully
    // For now, we'll log the message to the console for development purposes.
    console.log(`------ SMS (DEV) ------\nTO: ${to}\nBODY: ${body}\n-------------------------`);
    return;
  }
  
  if (!twilioPhoneNumber) {
    throw new Error('Twilio phone number is not configured.');
  }

  try {
    const message = await client.messages.create({
      body,
      from: twilioPhoneNumber,
      to,
    });
    console.log(`SMS sent successfully to ${to}. SID: ${message.sid}`);
  } catch (error) {
    console.error(`Failed to send SMS to ${to}:`, error);
    throw new Error('Failed to send SMS.');
  }
}
