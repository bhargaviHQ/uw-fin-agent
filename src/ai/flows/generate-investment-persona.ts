'use server';
/**
 * @fileOverview Generates an investment persona based on user input.
 *
 * - generateInvestmentPersona - A function that generates the investment persona.
 * - GenerateInvestmentPersonaInput - The input type for the generateInvestmentPersona function.
 * - GenerateInvestmentPersonaOutput - The return type for the generateInvestmentPersona function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const GenerateInvestmentPersonaInputSchema = z.object({
  userInput: z
    .string()
    .describe(
      'A description of the users investment goals, risk appetite, and time horizon.'
    ),
});
export type GenerateInvestmentPersonaInput = z.infer<typeof GenerateInvestmentPersonaInputSchema>;

const GenerateInvestmentPersonaOutputSchema = z.object({
  riskAppetite: z.string().describe('The users risk appetite (e.g., low, medium, high).'),
  investmentGoals: z.string().describe('The users investment goals (e.g., retirement, growth, income).'),
  timeHorizon: z.string().describe('The users time horizon (e.g., short, medium, long).'),
  investmentAmount: z.string().describe('The users investment amount.'),
  investmentStyle: z.string().describe('The users investment style (e.g., value, growth, index).'),
});
export type GenerateInvestmentPersonaOutput = z.infer<typeof GenerateInvestmentPersonaOutputSchema>;

export async function generateInvestmentPersona(input: GenerateInvestmentPersonaInput): Promise<GenerateInvestmentPersonaOutput> {
  return generateInvestmentPersonaFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateInvestmentPersonaPrompt',
  input: {
    schema: z.object({
      userInput: z
        .string()
        .describe(
          'A description of the users investment goals, risk appetite, and time horizon.'
        ),
    }),
  },
  output: {
    schema: z.object({
      riskAppetite: z.string().describe('The users risk appetite (e.g., low, medium, high).'),
      investmentGoals: z.string().describe('The users investment goals (e.g., retirement, growth, income).'),
      timeHorizon: z.string().describe('The users time horizon (e.g., short, medium, long).'),
      investmentAmount: z.string().describe('The users investment amount.'),
      investmentStyle: z.string().describe('The users investment style (e.g., value, growth, index).'),
    }),
  },
  prompt: `You are an expert investment advisor. Please use the following information to generate an investment persona for the user.

User Input: {{{userInput}}}

Based on the user input, please determine the following:

*   riskAppetite: The users risk appetite (e.g., low, medium, high).
*   investmentGoals: The users investment goals (e.g., retirement, growth, income).
*   timeHorizon: The users time horizon (e.g., short, medium, long).
*   investmentAmount: The users investment amount.
*   investmentStyle: The users investment style (e.g., value, growth, index).

Please output the investment persona in JSON format.
`,
});

const generateInvestmentPersonaFlow = ai.defineFlow<
  typeof GenerateInvestmentPersonaInputSchema,
  typeof GenerateInvestmentPersonaOutputSchema
>(
  {
    name: 'generateInvestmentPersonaFlow',
    inputSchema: GenerateInvestmentPersonaInputSchema,
    outputSchema: GenerateInvestmentPersonaOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
