'use server';
/**
 * @fileOverview Generates notification messages for AquaWise.
 *
 * - generateNotificationMessage - A function that creates a notification message based on type.
 * - GenerateNotificationMessageInput - The input type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateNotificationMessageInputSchema = z.object({
  type: z.enum(['usage', 'allocation']).describe('The type of notification to generate.'),
  threshold: z.number().optional().describe('The usage threshold percentage (only for usage type).'),
});

export type GenerateNotificationMessageInput = z.infer<typeof GenerateNotificationMessageInputSchema>;

const prompt = ai.definePrompt({
  name: 'generateNotificationMessagePrompt',
  input: { schema: GenerateNotificationMessageInputSchema },
  prompt: `You are an AI assistant for a water management application called AquaWise. Your task is to generate a concise, friendly, and helpful notification message for a user. The message should be a single sentence.

Use placeholders like {{user_name}}, {{usage_percent}}, {{start_date}}, and {{end_date}} where appropriate.

Notification Type: {{type}}
{{#if threshold}}Usage Threshold: {{threshold}}%{{/if}}

Generate the notification message now.`,
});

export async function generateNotificationMessage(input: GenerateNotificationMessageInput): Promise<string> {
    const {text} = await prompt(input);
    return text;
}
