
'use server';
/**
 * @fileOverview An AI flow to analyze water usage data.
 *
 * - analyzeUsage - A function that takes usage data and returns an analysis.
 * - AnalyzeUsageInput - The input type for the analyzeUsage function.
 * - AnalyzeUsageOutput - The return type for the analyzeUsage function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const AnalyzeUsageInputSchema = z.object({
  usageData: z
    .string()
    .describe(
      "A JSON string representing an array of water usage entries. Each entry should have 'date' (YYYY-MM-DD) and 'usage' (in gallons)."
    ),
});
export type AnalyzeUsageInput = z.infer<typeof AnalyzeUsageInputSchema>;

const AnalyzeUsageOutputSchema = z.object({
  analysis: z.string().describe("A concise, one to two sentence summary of the user's water usage patterns, highlighting any anomalies or key trends."),
  recommendations: z.array(z.string()).describe('A list of 2-3 actionable recommendations for water conservation based on the usage data.'),
});
export type AnalyzeUsageOutput = z.infer<typeof AnalyzeUsageOutputSchema>;

// This is the exported function that the UI will call.
export async function analyzeUsage(input: AnalyzeUsageInput): Promise<AnalyzeUsageOutput> {
  return analyzeUsageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeUsagePrompt',
  input: { schema: AnalyzeUsageInputSchema },
  output: { schema: AnalyzeUsageOutputSchema },
  prompt: `You are a water conservation expert for an agricultural irrigation company. Your goal is to help farmers understand their water usage and provide actionable advice.

Analyze the following water usage data, provided as a JSON string. Identify patterns, spikes, or inconsistencies.

Based on your analysis, provide a brief, insightful summary and 2-3 specific, actionable recommendations for how the user could conserve water or investigate potential issues (like leaks or inefficient scheduling).

Keep the tone helpful and professional.

Usage Data:
{{{usageData}}}
`,
});

const analyzeUsageFlow = ai.defineFlow(
  {
    name: 'analyzeUsageFlow',
    inputSchema: AnalyzeUsageInputSchema,
    outputSchema: AnalyzeUsageOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("The AI model did not return a valid analysis.");
    }
    return output;
  }
);
