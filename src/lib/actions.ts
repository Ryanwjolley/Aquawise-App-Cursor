
'use server';

import sgMail from '@sendgrid/mail';
import { format } from 'date-fns';
import type { Allocation, User, Unit, WaterOrder, Company } from './data';
import { getUnitLabel, getUserById } from './data';
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

const sendEmail = async (msg: sgMail.MailDataRequired) => {
     if (!process.env.SENDGRID_API_KEY || process.env.SENDGRID_API_KEY === "YOUR_SENDGRID_API_KEY_HERE" || !process.env.SENDGRID_FROM_EMAIL) {
        console.log("SENDGRID_API_KEY or SENDGRID_FROM_EMAIL not set. Skipping email send. Email content:");
        console.log(JSON.stringify(msg, null, 2));
        return;
    }
     try {
        await sgMail.send(msg);
        console.log(`Email sent to ${Array.isArray(msg.to) ? msg.to.join(', ') : msg.to}`);
    } catch (error) {
        console.error('Error sending SendGrid email', error);
        throw new Error('Failed to send notification email.');
    }
}


export const sendAllocationNotificationEmail = async (allocation: Allocation, recipients: User[], updateType: 'created' | 'updated', unit: Unit) => {
    
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

    await sendEmail(msg);
};

export const sendWaterOrderSubmissionEmail = async (order: WaterOrder, user: User, recipients: User[]) => {

    const formattedStart = format(new Date(order.startDate), 'P p');
    const formattedEnd = format(new Date(order.endDate), 'P p');
    const unitLabel = getUnitLabel(order.unit);

    const msg = {
        to: recipients.map(r => r.email),
        from: process.env.SENDGRID_FROM_EMAIL!,
        subject: `New Water Order Submitted by ${user.name}`,
        html: `
            <p>A new water order has been submitted for your review.</p>
            <ul>
                <li><strong>User:</strong> ${user.name} (${user.email})</li>
                <li><strong>Period:</strong> ${formattedStart} to ${formattedEnd}</li>
                <li><strong>Requested Amount:</strong> ${order.amount.toLocaleString()} ${unitLabel}</li>
            </ul>
            <p>Please log in to the AquaWise admin dashboard to approve or reject this request.</p>
        `,
    };

    await sendEmail(msg);
}

export const sendWaterOrderStatusUpdateEmail = async (order: WaterOrder, user: User) => {
    const formattedStart = format(new Date(order.startDate), 'P p');
    const formattedEnd = format(new Date(order.endDate), 'P p');
    const unitLabel = getUnitLabel(order.unit);

    const subject = `Your Water Order has been ${order.status}`;
    let body = `
        <p>Hello ${user.name},</p>
        <p>An update has been made to your recent water order.</p>
        <ul>
            <li><strong>Order Period:</strong> ${formattedStart} to ${formattedEnd}</li>
            <li><strong>Request:</strong> ${order.amount.toLocaleString()} ${unitLabel}</li>
            <li><strong>New Status:</strong> ${order.status.toUpperCase()}</li>
        </ul>
    `;

    if (order.status === 'rejected' && order.adminNotes) {
        body += `<p><strong>Administrator's Note:</strong> ${order.adminNotes}</p>`;
    }

    body += `<p>You can view the details by logging into your AquaWise dashboard.</p>`;

    const msg = {
        to: user.email,
        from: process.env.SENDGRID_FROM_EMAIL!,
        subject: subject,
        html: body,
    };

    await sendEmail(msg);
};


export const sendThresholdAlertEmail = async (user: User, company: Company, usage: number, allocation: number, percentage: number) => {
    const unit = company.defaultUnit;
    const unitLabel = getUnitLabel(unit);
    const convertedUsage = usage * CONVERSION_FACTORS_FROM_GALLONS[unit as keyof typeof CONVERSION_FACTORS_FROM_GALLONS];
    const convertedAllocation = allocation * CONVERSION_FACTORS_FROM_GALLONS[unit as keyof typeof CONVERSION_FACTORS_FROM_GALLONS];

    const message = `
        <p>Hello,</p>
        <p>This is an automated alert to inform you that ${user.name} has reached ${percentage}% of their water allocation for the current period.</p>
        <ul>
            <li><strong>User:</strong> ${user.name}</li>
            <li><strong>Current Usage:</strong> ${convertedUsage.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unitLabel}</li>
            <li><strong>Total Allocation:</strong> ${convertedAllocation.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unitLabel}</li>
        </ul>
        <p>You can view more details on the AquaWise dashboard.</p>
    `;

    const userMsg = {
        to: user.email,
        from: process.env.SENDGRID_FROM_EMAIL!,
        subject: `Alert: You've reached ${percentage}% of your water allocation`,
        html: message,
    };
    
    // In a real app, you would get the admin email from the notification settings in the DB
    const adminEmail = 'admin@example.com'; 

    const adminMsg = {
        to: adminEmail,
        from: process.env.SENDGRID_FROM_EMAIL!,
        subject: `ALERT: ${user.name} has reached ${percentage}% of their allocation`,
        html: message,
    };

    await Promise.all([sendEmail(userMsg), sendEmail(adminMsg)]);
}

export const sendSpikeAlertEmail = async (user: User, company: Company, dailyUsage: number, weeklyAverage: number) => {
    const unit = company.defaultUnit;
    const unitLabel = getUnitLabel(unit);
    const convertedDailyUsage = dailyUsage * CONVERSION_FACTORS_FROM_GALLONS[unit as keyof typeof CONVERSION_FACTORS_FROM_GALLONS];
    const convertedWeeklyAverage = weeklyAverage * CONVERSION_FACTORS_FROM_GALLONS[unit as keyof typeof CONVERSION_FACTORS_FROM_GALLONS];
    const spikePercentage = weeklyAverage > 0 ? Math.round(((dailyUsage - weeklyAverage) / weeklyAverage) * 100) : 100;

     const message = `
        <p>Hello,</p>
        <p>This is an automated alert to inform you of a significant spike in water usage for ${user.name}.</p>
        <ul>
            <li><strong>User:</strong> ${user.name}</li>
            <li><strong>Yesterday's Usage:</strong> ${convertedDailyUsage.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unitLabel}</li>
            <li><strong>Weekly Average Usage:</strong> ${convertedWeeklyAverage.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unitLabel}/day</li>
            <li><strong>Spike:</strong> ${spikePercentage}% above average</li>
        </ul>
        <p>This could indicate a leak or other issue. Please review the usage data on the AquaWise dashboard.</p>
    `;

    const userMsg = {
        to: user.email,
        from: process.env.SENDGRID_FROM_EMAIL!,
        subject: `Alert: High Usage Spike Detected`,
        html: message,
    };

    // In a real app, you would get the admin email from the notification settings in the DB
    const adminEmail = 'admin@example.com';
    
    const adminMsg = {
        to: adminEmail,
        from: process.env.SENDGRID_FROM_EMAIL!,
        subject: `ALERT: High Usage Spike for ${user.name}`,
        html: message,
    };

    await Promise.all([sendEmail(userMsg), sendEmail(adminMsg)]);
};
