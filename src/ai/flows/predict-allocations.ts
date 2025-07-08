'use server';
/**
 * @fileOverview A flow that predicts future water allocations based on recent usage.
 *
 * - predictAllocationChanges - A function that handles the prediction of water allocation changes.
 * - PredictAllocationChangesInput - The input type for the predictAllocationChanges function.
 * - PredictAllocationChangesOutput - The return type for the predictAllocationChanges function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const UserUsageSchema = z.object({
  name: z.string().describe("User's name."),
  used: z.number().describe('Water used in gallons for the period.'),
  shares: z.number().describe('Number of shares the user has.'),
});

const PredictAllocationChangesInputSchema = z.object({
  usageDataForPeriod: z.array(UserUsageSchema).describe("Each user's usage data for a specific period."),
  periodDurationInDays: z.number().describe('The duration of the usage period in days.'),
  currentGallonsPerShare: z.number().describe('The current allocation of gallons per share.'),
});
export type PredictAllocationChangesInput = z.infer<typeof PredictAllocationChangesInputSchema>;

const PredictAllocationChangesOutputSchema = z.object({
  predictedGallonsPerShare: z.number().describe('The predicted gallons per share for a similar future period.'),
  justification: z.string().describe('The justification for the predicted allocation changes, explaining the reasoning.'),
});
export type PredictAllocationChangesOutput = z.infer<typeof PredictAllocationChangesOutputSchema>;

export async function predictAllocationChanges(input: PredictAllocationChangesInput): Promise<PredictAllocationChangesOutput> {
  return predictAllocationChangesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'predictAllocationChangesPrompt',
  input: {schema: PredictAllocationChangesInputSchema},
  output: {schema: PredictAllocationChangesOutputSchema},
  prompt: `You are a data analyst for a water company. Your task is to predict future water needs based on recent consumption and suggest an allocation per share.

  The following data represents water usage for all users over a {{{periodDurationInDays}}}-day period.
  The current allocation is {{{currentGallonsPerShare}}} gallons per share.

  Usage Data:
  {{#each usageDataForPeriod}}
  - User: {{name}}, Used: {{used}} gallons, Shares: {{shares}}
  {{/each}}

  Analyze this usage data. Extrapolate from this period to predict the likely consumption for the next similar-length period.
  Based on your prediction, calculate and suggest a new 'gallons per share' value.
  The goal is to proactively adjust allocations to match demand. If usage is high, the allocation might need to increase to avoid shortages, or you might suggest it stays the same to encourage conservation.

  Provide a clear justification for your prediction.
  Respond with a valid JSON object.`,
});

const predictAllocationChangesFlow = ai.defineFlow(
  {
    name: 'predictAllocationChangesFlow',
    inputSchema: PredictAllocationChangesInputSchema,
    outputSchema: PredictAllocationChangesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
