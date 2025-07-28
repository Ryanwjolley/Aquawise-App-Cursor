
'use server';

import sgMail from '@sendgrid/mail';
import { format } from 'date-fns';
import type { Allocation, User, Unit } from './data';
import { getUnitLabel } from './data';
import "dotenv/config";


if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const CONVERSION_FACTORS_FROM_GALLONS: Record<Exclude<Unit, 'cfs' | 'gpm' | 'acre-feet-day'>, number> = {
    'gallons': 1,
    'kgal': 1 / 1000,
    'acre-feet': 1 / 325851,
    'cubic-feet': 1/ 7.48052,
};

export const sendAllocationNotificationEmail = async (allocation: Allocation, recipients: User[], updateType: 'created' | 'updated', unit: Unit) => {
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

    const convertedAmount = allocation.gallons * CONVERSION_FACTORS_FROM_GALLONS[unit as keyof typeof CONVERSION_FACTORS_FROM_GALLONS];
    const unitLabel = getUnitLabel(unit);

    const msg = {
        to: recipients.map(r => r.email),
        from: process.env.SENDGRID_FROM_EMAIL!,
        subject: `Your Water Allocation has been ${updateType === 'updated' ? 'Updated' : 'Created'}`,
        html: `
            <p>Hello,</p>
            <p>Your water allocation has been ${updateType}. Here are the details:</p>
            <ul>
                <li><strong>Period:</strong> ${formattedStart} to ${formattedEnd}</li>
                <li><strong>Allocated Amount:</strong> ${convertedAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unitLabel}</li>
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
