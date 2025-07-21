'use server';

import sgMail from '@sendgrid/mail';
import { format } from 'date-fns';
import type { Allocation, User } from './data';
import "dotenv/config";


if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export const sendAllocationNotificationEmail = async (allocation: Allocation, recipients: User[], updateType: 'created' | 'updated') => {
    if (!process.env.SENDGRID_API_KEY || process.env.SENDGRID_API_KEY === "YOUR_SENDGRID_API_KEY_HERE" || !process.env.SENDGRID_FROM_EMAIL) {
        console.log("SENDGRID_API_KEY or SENDGRID_FROM_EMAIL not set. Skipping email send. Email content:");
        console.log({
            to: recipients.map(r => r.email),
            from: process.env.SENDGRID_FROM_EMAIL || 'test@example.com',
            subject: `Water Allocation ${updateType === 'updated' ? 'Updated' : 'Created'}`,
            text: `Details: ${JSON.stringify(allocation)}`
        });
        return;
    }

    const formattedStart = format(new Date(allocation.startDate), 'P p');
    const formattedEnd = format(new Date(allocation.endDate), 'P p');

    const msg = {
        to: recipients.map(r => r.email),
        from: process.env.SENDGRID_FROM_EMAIL!,
        subject: `Your Water Allocation has been ${updateType === 'updated' ? 'Updated' : 'Created'}`,
        html: `
            <p>Hello,</p>
            <p>Your water allocation has been ${updateType}. Here are the details:</p>
            <ul>
                <li><strong>Period:</strong> ${formattedStart} to ${formattedEnd}</li>
                <li><strong>Allocated Amount:</strong> ${allocation.gallons.toLocaleString()} gallons</li>
            </ul>
            <p>You can view your usage and allocation details by logging into the AquaWise dashboard.</p>
            <p>Thank you,<br/>AquaWise Team</p>
        `,
    };

    try {
        await sgMail.send(msg);
        console.log(`Allocation notification email sent to ${recipients.map(r => r.email).join(', ')}`);
    } catch (error) {
        console.error('Error sending SendGrid email', error);
        // In a real app, you might want to re-throw or handle this more gracefully
        throw new Error('Failed to send notification email.');
    }
};
