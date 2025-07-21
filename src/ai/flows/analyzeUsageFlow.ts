
'use server';

/**
 * @fileOverview An AI agent for analyzing water usage data.
 *
 * - analyzeUsage - A function that handles the usage analysis process.
 * - AnalyzeUsageInput - The input type for the analyzeUsage function.
 * - AnalyzeUsageOutput - The return type for the analyzeUsage function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getAllocationsByCompany, getUsersByCompany, getUsageForUser } from '@/lib/data';
import { format } from 'date-fns';

export const AnalyzeUsageInputSchema = z.object({
  companyId: z.string().describe('The ID of the company to analyze.'),
  query: z.string().describe('The user query about their water usage.'),
});
export type AnalyzeUsageInput = z.infer<typeof AnalyzeUsageInputSchema>;

export const AnalyzeUsageOutputSchema = z.object({
  analysis: z.string().describe('The natural language analysis of the usage data.'),
});
export type AnalyzeUsageOutput = z.infer<typeof AnalyzeUsageOutputSchema>;

// This is the main function that will be called from the UI.
export async function analyzeUsage(input: AnalyzeUsageInput): Promise<AnalyzeUsageOutput> {
  return analyzeUsageFlow(input);
}


// Helper function to get all relevant data for a company.
// This is NOT a tool. It's a regular function that we call to prepare the data
// that will *always* be sent to the LLM.
async function getCompanyData(companyId: string) {
    const users = await getUsersByCompany(companyId);
    const allocations = await getAllocationsByCompany(companyId);

    const usagePromises = users.map(user => 
        // We fetch usage data for a wide range to answer historical questions.
        // A real app might have more sophisticated date range handling.
        getUsageForUser(user.id, '2025-01-01', '2025-12-31')
    );
    const usageResults = await Promise.all(usagePromises);

    const usageDataByUser: Record<string, any[]> = {};
    users.forEach((user, index) => {
        usageDataByUser[user.id] = usageResults[index].map(u => ({ date: u.date, usage: u.usage }));
    });
    
    // Format the data into a string for the prompt
    return `
## Company Data

**Users:**
${users.map(u => `- ID: ${u.id}, Name: ${u.name}, Role: ${u.role}, Shares: ${u.shares || 'N/A'}`).join('\n')}

**Allocations:**
${allocations.map(a => `- Period: ${format(new Date(a.startDate), 'P')} to ${format(new Date(a.endDate), 'P')}, Gallons: ${a.gallons.toLocaleString()}, Applies to: ${a.userId || 'All Users'}`).join('\n')}

**Usage Data (by User ID):**
${Object.entries(usageDataByUser).map(([userId, usage]) => `
### Usage for User ${userId} (${users.find(u => u.id === userId)?.name})
${usage.length > 0 ? usage.map(u => `- Date: ${u.date}, Usage: ${u.usage.toLocaleString()} gal`).join('\n') : 'No usage data for this period.'}
`).join('\n')}
    `;
}


const prompt = ai.definePrompt({
  name: 'analyzeUsagePrompt',
  input: { schema: z.object({ query: z.string(), companyData: z.string() }) },
  output: { schema: AnalyzeUsageOutputSchema },
  prompt: `You are an expert water usage analyst for an agricultural software company.
Your role is to answer questions from company administrators about their water usage, allocations, and user data.

Today's date is ${format(new Date(), 'PPPP')}.

You will be provided with a user's question and a complete dataset for their company.
Analyze the provided data to answer the user's query accurately and concisely.

When comparing users or time periods, perform the necessary calculations (sums, averages, etc.) and present the key findings.
Provide clear, data-driven answers. Do not make up information. If the data to answer the question is not present, state that.

**User Query:**
{{{query}}}

---

**Company Dataset:**
{{{companyData}}}
`,
});

const analyzeUsageFlow = ai.defineFlow(
  {
    name: 'analyzeUsageFlow',
    inputSchema: AnalyzeUsageInputSchema,
    outputSchema: AnalyzeUsageOutputSchema,
  },
  async (input) => {
    // 1. Fetch all necessary data for the company.
    const companyData = await getCompanyData(input.companyId);

    // 2. Call the prompt with the user's query and the fetched data.
    const { output } = await prompt({
        query: input.query,
        companyData: companyData,
    });
    
    // 3. Return the generated analysis.
    return output!;
  }
);

    