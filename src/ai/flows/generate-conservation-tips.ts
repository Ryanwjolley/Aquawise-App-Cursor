// src/ai/flows/generate-conservation-tips.ts
'use server';

/**
 * @fileOverview AI-powered water conservation tips generator based on user usage patterns.
 *
 * - generateConservationTips - A function that generates personalized water conservation tips.
 * - GenerateConservationTipsInput - The input type for the generateConservationTips function.
 * - GenerateConservationTipsOutput - The return type for the generateConservationTips function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateConservationTipsInputSchema = z.object({
  weeklyAllocation: z.number().describe('The user\'s weekly water allocation in gallons.'),
  waterUsed: z.number().describe('The amount of water the user has used in gallons.'),
  usagePercentage: z
    .number()
    .describe(
      'The percentage of the weekly water allocation the user has used. Values should be between 0 and 100.'
    ),
});
export type GenerateConservationTipsInput = z.infer<
  typeof GenerateConservationTipsInputSchema
>;

const GenerateConservationTipsOutputSchema = z.object({
  tips: z
    .array(z.string())
    .describe(
      'An array of personalized water conservation tips based on the user\'s usage patterns.'
    ),
});
export type GenerateConservationTipsOutput = z.infer<
  typeof GenerateConservationTipsOutputSchema
>;

export async function generateConservationTips(
  input: GenerateConservationTipsInput
): Promise<GenerateConservationTipsOutput> {
  return generateConservationTipsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateConservationTipsPrompt',
  input: {schema: GenerateConservationTipsInputSchema},
  output: {schema: GenerateConservationTipsOutputSchema},
  prompt: `You are an AI assistant that provides personalized water conservation tips to users based on their weekly water usage.

  Consider the user\'s weekly water allocation, the amount of water they\'ve used, and the percentage of their allocation they\'ve consumed.

  Provide concise and actionable tips to help the user conserve water and make more informed decisions about their water usage.

  Weekly Allocation: {{weeklyAllocation}} gallons
  Water Used: {{waterUsed}} gallons
  Usage Percentage: {{usagePercentage}}%

  Provide at least three tips that are relevant to the user\'s current water usage patterns.
  The tips should be specific and actionable.
  Ensure the generated tips are tailored to encourage water conservation.
  Do not include any introductory or concluding remarks.
  Do not mention the weekly allocation, water used or usage percentage in the tips.

  Tips:
  `,
});

const generateConservationTipsFlow = ai.defineFlow(
  {
    name: 'generateConservationTipsFlow',
    inputSchema: GenerateConservationTipsInputSchema,
    outputSchema: GenerateConservationTipsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
