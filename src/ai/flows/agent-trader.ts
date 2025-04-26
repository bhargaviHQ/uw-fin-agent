
'use server';
/**
 * @fileOverview An AI agent that monitors stock market conditions and makes trades based on a user's investment persona and strategy.
 *
 * - runAgentTrader - Public function to invoke the agent trader flow.
 * - AgentTraderInput - The input type for the agentTrader function.
 * - AgentTraderOutput - The return type for the agentTrader function.
 * - agentTraderFlow - The Genkit flow definition.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import type { StockData, CompanyPerformance, NewsHeadline } from '@/services/stock-data';
// Import the actual data fetching functions
import { getStockData, getCompanyPerformance, getNewsHeadlines } from '@/services/stock-data'; // Ensure getNewsHeadlines now uses NewsAPI
import type { GenerateInvestmentPersonaOutput } from '@/ai/flows/generate-investment-persona'; // Import persona type
import type { PortfolioItem } from '@/types';

// Define Zod schema for the persona within the input
const InvestmentPersonaSchema = z.object({
  riskAppetite: z.string().describe('The users risk appetite (e.g., low, medium, high).'),
  investmentGoals: z.string().describe('The users investment goals (e.g., retirement, growth, income).'),
  timeHorizon: z.string().describe('The users time horizon (e.g., short, medium, long).'),
  investmentAmount: z.string().describe('The users investment amount.'),
  investmentStyle: z.string().describe('The users investment style (e.g., value, growth, index).'),
});

const PortfolioItemSchema = z.object({
  symbol: z.string(),
  companyName: z.string(),
  quantity: z.number(),
  purchasePrice: z.number(),
  currentPrice: z.number(),
});
// Extended schema for prompt input with formatted strings
const PortfolioItemPromptSchema = PortfolioItemSchema.extend({
    purchasePriceFormatted: z.string(),
    currentPriceFormatted: z.string(),
});


const AgentTraderInputSchema = z.object({
  userPersona: InvestmentPersonaSchema.describe("The user's investment persona."),
  currentPortfolio: z.array(PortfolioItemSchema).describe("The user's current stock portfolio."),
  virtualBalance: z.number().describe("The user's current virtual cash balance."),
  monitoredSymbols: z.array(z.string()).describe("A list of stock symbols the agent should actively monitor."),
});
export type AgentTraderInput = z.infer<typeof AgentTraderInputSchema>;

// Schema for the data actually passed to the prompt, including formatted currency and symbols
const AgentTraderPromptInputSchema = AgentTraderInputSchema.extend({
    currentPortfolio: z.array(PortfolioItemPromptSchema), // Use extended portfolio schema
    virtualBalanceFormatted: z.string(), // Add formatted balance
    monitoredSymbolsFormatted: z.string().describe("Comma-separated list of monitored stock symbols."), // Add formatted symbols string
});

// Define the structure for a trade decision
const TradeDecisionSchema = z.object({
    action: z.enum(['buy', 'sell', 'hold']).describe("The recommended action: buy, sell, or hold."),
    symbol: z.string().describe("The stock symbol for the action."),
    quantity: z.number().optional().describe("The number of shares to trade (required for buy/sell)."),
    reasoning: z.string().describe("The justification for the trade decision based on the persona, strategy, market data, and recent news."), // Updated description
    confidenceScore: z.number().min(0).max(1).step(0.01).optional().describe("A score (0.00-1.00) indicating the agent's confidence in this decision."), // Changed to 0-1 scale
});


const AgentTraderOutputSchema = z.object({
  tradeDecisions: z.array(TradeDecisionSchema).describe("A list of trade decisions made by the agent for the monitored symbols."),
  overallStrategyAdjustment: z.string().optional().describe("Any suggested adjustments to the overall investment strategy based on current conditions and news."), // Updated description
});
export type AgentTraderOutput = z.infer<typeof AgentTraderOutputSchema>;

// --- Tools for the Agent ---

// Tool to get current stock data - Uses REAL API call (Yahoo Finance)
const getCurrentStockDataTool = ai.defineTool({
  name: 'getCurrentStockData',
  description: 'Retrieves the latest price, daily high, daily low, and company name for a given stock symbol from Yahoo Finance.',
  inputSchema: z.object({
    symbol: z.string().describe('The stock symbol (e.g., AAPL).'),
  }),
  // Use the actual StockData interface structure
  outputSchema: z.object({
    symbol: z.string(),
    price: z.number(),
    dailyHigh: z.number(),
    dailyLow: z.number(),
    companyName: z.string(),
  }),
}, async ({ symbol }) => {
    try {
        console.log(`Agent Tool: Fetching stock data for ${symbol} from Yahoo Finance...`);
        const data = await getStockData(symbol); // Call the real service function
        console.log(`Agent Tool: Stock data received for ${symbol}:`, data);
        return data;
    } catch (error: any) {
        console.error(`Agent Tool Error: Error fetching stock data for ${symbol}:`, error.message);
        // Provide a more informative error message to the LLM
        throw new Error(`Failed to fetch stock data for ${symbol}. Reason: ${error.message}. The symbol might be invalid or the service is unavailable.`);
    }
});

// Tool to get company performance data - Uses REAL API call (Yahoo Finance)
const getCompanyPerformanceTool = ai.defineTool({
  name: 'getCompanyPerformanceData',
  description: 'Retrieves key performance metrics like revenue (if available), EPS, and P/E ratio for a given stock symbol from Yahoo Finance.',
  inputSchema: z.object({
    symbol: z.string().describe('The stock symbol (e.g., AAPL).'),
  }),
  // Use the actual CompanyPerformance interface structure, note revenue is optional
   outputSchema: z.object({
      symbol: z.string(),
      revenue: z.number().optional().nullable(), // Mark revenue as optional and potentially null
      eps: z.number(),
      peRatio: z.number(), // Allow NaN for PE Ratio
  }),
}, async ({ symbol }) => {
    try {
        console.log(`Agent Tool: Fetching company performance for ${symbol} from Yahoo Finance...`);
        const data = await getCompanyPerformance(symbol); // Call the real service function
        console.log(`Agent Tool: Company performance received for ${symbol}:`, data);
        return data;
    } catch (error: any) {
        console.error(`Agent Tool Error: Error fetching company performance for ${symbol}:`, error.message);
        throw new Error(`Failed to fetch company performance data for ${symbol}. Reason: ${error.message}.`);
    }
});

// Tool to get recent news headlines - Uses REAL API call (NewsAPI.org via service)
const getRecentNewsTool = ai.defineTool({
    name: 'getRecentNewsHeadlines',
    // Updated description to mention NewsAPI.org
    description: 'Retrieves recent news headlines for a given stock symbol from NewsAPI.org to understand market sentiment and potential impacts.',
    inputSchema: z.object({
      symbol: z.string().describe('The stock symbol (e.g., AAPL).'),
    }),
    // Use the actual NewsHeadline interface structure
    outputSchema: z.array(z.object({
        title: z.string(),
        url: z.string(),
        source: z.string(),
        publishedAt: z.string(), // ISO date string
    })).describe("An array of recent news headlines from NewsAPI.org."),
}, async({ symbol }) => {
    try {
        console.log(`Agent Tool: Fetching news headlines for ${symbol} from NewsAPI.org...`);
        // Calls the updated getNewsHeadlines function in stock-data.ts
        const data = await getNewsHeadlines(symbol);
        console.log(`Agent Tool: News headlines received for ${symbol}:`, data.length > 0 ? `${data.length} headlines` : 'No headlines');
        return data;
    } catch (error: any) {
         console.error(`Agent Tool Error: Error fetching news headlines for ${symbol}:`, error.message);
         // Pass specific error messages back
         throw new Error(`Failed to fetch news headlines for ${symbol}. Reason: ${error.message}.`);
    }
});


// --- Agent Prompt ---

const agentTraderPrompt = ai.definePrompt({
  name: 'agentTraderPrompt',
  tools: [getCurrentStockDataTool, getCompanyPerformanceTool, getRecentNewsTool], // Ensure all tools are included
  input: { schema: AgentTraderPromptInputSchema }, // Use the extended input schema with formatted strings
  output: { schema: AgentTraderOutputSchema },
  // Removed customize block as helpers are no longer needed in the template
  // Updated prompt description to mention NewsAPI.org source
  // Updated prompt to use pre-formatted currency and symbols strings
  prompt: `You are an autonomous investment agent. Your goal is to manage a simulated stock portfolio based on the provided user persona and current market conditions, including recent news fetched from NewsAPI.org.

User Persona:
Risk Appetite: {{{userPersona.riskAppetite}}}
Investment Goals: {{{userPersona.investmentGoals}}}
Time Horizon: {{{userPersona.timeHorizon}}}
Investment Amount: {{{userPersona.investmentAmount}}} (Note: Use Virtual Balance for available cash)
Investment Style: {{{userPersona.investmentStyle}}}

Current Portfolio:
{{#if currentPortfolio.length}}
{{#each currentPortfolio}}
- {{symbol}}: {{quantity}} shares @ avg $ {{purchasePriceFormatted}} (Current: $ {{currentPriceFormatted}})
{{/each}}
{{else}}
- Portfolio is empty.
{{/if}}
Virtual Balance: $ {{virtualBalanceFormatted}}

Monitored Symbols: {{{monitoredSymbolsFormatted}}}

Instructions:
1.  For EACH monitored symbol in the list [{{{monitoredSymbolsFormatted}}}]:
    a.  Use the 'getCurrentStockData' tool to get the latest market data (price, high, low, company name) from Yahoo Finance.
    b.  Use the 'getCompanyPerformanceData' tool to get company performance metrics (Revenue (if available), EPS, P/E ratio) from Yahoo Finance. Note that P/E might be NaN if earnings are negative.
    c.  Use the 'getRecentNewsHeadlines' tool to fetch recent news headlines from NewsAPI.org.
    d.  If any tool fails for a symbol (e.g., invalid symbol, API error, rate limit), make a note of the failure in your reasoning for that symbol and proceed to the next symbol. Do not halt the entire process. Make a 'hold' decision with reasoning indicating the data fetch failure.
2.  Analyze the fetched data (stock price, performance metrics, news headlines) in the context of the user's persona (risk, goals, style) and their current portfolio holdings. Pay close attention to how news (especially from NewsAPI.org) might impact the stock's short-term and long-term prospects. Consider the P/E ratio (even if NaN) and EPS.
3.  Decide whether to 'buy', 'sell', or 'hold' each monitored stock.
4.  If buying, determine a reasonable quantity based on the virtual balance (use the numerical value, not the formatted string, for calculation checks if needed, but remember the balance is $ {{virtualBalanceFormatted}}), risk profile, news sentiment, and diversification principles. Avoid overly concentrating the portfolio. A typical single stock position might be 5-15% of the total portfolio value (holdings + balance). Do not exceed available virtual balance. Factor in potential risks highlighted in the news. Ensure quantity is a positive whole number.
5.  If selling, determine the quantity. You can sell a portion or all of the holding for that symbol. Consider if negative news warrants reducing exposure. Only sell shares currently held in the portfolio. Ensure quantity is a positive whole number and does not exceed owned shares.
6.  For each decision ('buy', 'sell', 'hold'), provide clear, concise reasoning, linking it back to the persona, strategy, data, AND NEWS sentiment from NewsAPI.org. Assign a confidence score between 0.00 and 1.00 (e.g., 0.75).
7.  Optionally, suggest an 'overallStrategyAdjustment' if current market conditions, news trends (from NewsAPI.org), or portfolio performance warrant a shift in approach (e.g., "Consider shifting slightly more defensive due to widespread negative tech news from NewsAPI.org and market volatility.").

Output Format:
Return a JSON object matching the AgentTraderOutput schema, containing an array of 'tradeDecisions' (one for each monitored symbol, even if data fetch failed) and optionally 'overallStrategyAdjustment'. Ensure 'quantity' is provided AND is a positive whole number for 'buy' and 'sell' actions. Ensure 'confidenceScore' is between 0.00 and 1.00.
`,
});


// --- Agent Flow ---

export const agentTraderFlow = ai.defineFlow<
  typeof AgentTraderInputSchema, // Takes original input type
  typeof AgentTraderOutputSchema // Returns original output type
>({
  name: 'agentTraderFlow',
  inputSchema: AgentTraderInputSchema,
  outputSchema: AgentTraderOutputSchema,
}, async (input) => {
    console.log("Agent Trader Flow Raw Input:", JSON.stringify(input, null, 2));

    // Helper function for formatting currency
    const formatCurrency = (value: number) => value?.toFixed(2) ?? 'N/A';

    // Pre-process input for the prompt: Format currency values and join symbols
    const promptInput: z.infer<typeof AgentTraderPromptInputSchema> = {
        ...input,
        virtualBalanceFormatted: formatCurrency(input.virtualBalance),
        currentPortfolio: input.currentPortfolio.map(item => ({
            ...item,
            purchasePriceFormatted: formatCurrency(item.purchasePrice),
            currentPriceFormatted: formatCurrency(item.currentPrice),
        })),
        monitoredSymbolsFormatted: input.monitoredSymbols.join(', '), // Pre-format the symbols list
    };

    console.log("Agent Trader Flow Processed Prompt Input:", JSON.stringify(promptInput, null, 2));

    // The prompt itself instructs the LLM to use the tools.
    // Genkit handles the tool calling loop based on the prompt instructions.
    const { output } = await agentTraderPrompt(promptInput); // No need to pass handlebarsOptions

    if (!output) {
        console.error("Agent Trader Flow: No output received from the prompt.");
        throw new Error("Agent failed to produce an output.");
    }

    console.log("Agent Trader Flow Output:", JSON.stringify(output, null, 2));

    // Basic validation on output
     if (!output.tradeDecisions || !Array.isArray(output.tradeDecisions)) {
         console.error("Agent Trader Flow: Invalid tradeDecisions format in output.");
         throw new Error("Agent produced invalid trade decisions format.");
     }

    // Further validation could be added here (e.g., check quantities, symbols, confidence scores)
     output.tradeDecisions.forEach(decision => {
         // Ensure quantity is a positive integer for buy/sell
         if ((decision.action === 'buy' || decision.action === 'sell')) {
             if (decision.quantity === undefined || decision.quantity === null || !Number.isInteger(decision.quantity) || decision.quantity <= 0) {
                 console.warn(`Agent Trader Flow: Invalid or missing quantity (${decision.quantity}) for ${decision.action} action on ${decision.symbol}. Correcting or discarding.`);
                 // Set quantity to 0 to prevent execution downstream and add note to reasoning
                 decision.quantity = 0;
                 decision.reasoning += ' (Invalid quantity provided by agent)';

             }
         }
         if (decision.confidenceScore && (decision.confidenceScore < 0 || decision.confidenceScore > 1)) {
             console.warn(`Agent Trader Flow: Invalid confidence score (${decision.confidenceScore}) for ${decision.symbol}. Clamping to [0, 1].`);
             decision.confidenceScore = Math.max(0, Math.min(1, decision.confidenceScore));
         }
     });


    return output;
});

/**
 * Public function to invoke the agent trader flow.
 * This acts as the entry point from the application code.
 * @param input Input data including persona, portfolio, balance, and symbols.
 * @returns A promise resolving to the agent's trade decisions and strategy adjustments.
 */
export async function runAgentTrader(input: AgentTraderInput): Promise<AgentTraderOutput> {
  return agentTraderFlow(input);
}

