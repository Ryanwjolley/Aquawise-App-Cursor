// This file is machine-generated - edit with caution!
'use server';
/**
 * @fileOverview A flow that suggests changes to user water allocations based on consumption patterns and conservation goals.
 *
 * - suggestAllocationChanges - A function that handles the suggestion of water allocation changes.
 * - SuggestAllocationChangesInput - The input type for the suggestAllocationChanges function.
 * - SuggestAllocationChangesOutput - The return type for the suggestAllocationChanges function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestAllocationChangesInputSchema = z.object({
  totalUsers: z.number().describe('The total number of water users.'),
  totalWeeklyAllocation: z.number().describe('The total weekly water allocation in gallons.'),
  totalWaterConsumed: z.number().describe('The total water consumed by all users in gallons.'),
  averageUsagePerUser: z.number().describe('The average water usage per user in gallons.'),
  conservationGoal: z.string().describe('The conservation goal to achieve (e.g., reduce consumption by 10%).'),
  currentGallonsPerShare: z.number().describe('The current allocation of gallons per share.'),
});
export type SuggestAllocationChangesInput = z.infer<typeof SuggestAllocationChangesInputSchema>;

const SuggestAllocationChangesOutputSchema = z.object({
  suggestedGallonsPerShare: z.number().describe('The suggested gallons per share for the next allocation period.'),
  justification: z.string().describe('The justification for the suggested allocation changes.'),
});
export type SuggestAllocationChangesOutput = z.infer<typeof SuggestAllocationChangesOutputSchema>;

export async function suggestAllocationChanges(input: SuggestAllocationChangesInput): Promise<SuggestAllocationChangesOutput> {
  return suggestAllocationChangesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestAllocationChangesPrompt',
  input: {schema: SuggestAllocationChangesInputSchema},
  output: {schema: SuggestAllocationChangesOutputSchema},
  prompt: `You are an expert water resource manager tasked with optimizing water distribution and promoting responsible usage.

  Based on the following data, suggest changes to the water allocation strategy. The current water allocation is {{{currentGallonsPerShare}}} gallons per share.

  Total Users: {{{totalUsers}}}
  Total Weekly Allocation: {{{totalWeeklyAllocation}}} gallons
  Total Water Consumed: {{{totalWaterConsumed}}} gallons
  Average Usage Per User: {{{averageUsagePerUser}}} gallons
  Conservation Goal: {{{conservationGoal}}}

  Consider the conservation goal and current usage patterns to determine if the gallons per share should be increased, decreased, or remain the same.

  Provide a suggested gallons per share for the next allocation period and a clear justification for your recommendation.
  Ensure that the suggested allocation is a reasonable number.
  Remember to respond with valid JSON.`,
});

const suggestAllocationChangesFlow = ai.defineFlow(
  {
    name: 'suggestAllocationChangesFlow',
    inputSchema: SuggestAllocationChangesInputSchema,
    outputSchema: SuggestAllocationChangesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
