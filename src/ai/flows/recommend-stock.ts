
'use server';
/**
 * @fileOverview Recommends stocks based on a chosen investment strategy and optional user risk profile, explaining the reasons. Uses real data from Yahoo Finance.
 *
 * - recommendStock - A function that recommends a stock based on a strategy and risk profile.
 * - RecommendStockInput - The input type for the recommendStock function.
 * - RecommendStockOutput - The return type for the recommendStock function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
// Import REAL data fetching functions and types
import {CompanyPerformance, getCompanyPerformance, getStockData, StockData} from '@/services/stock-data';

const RecommendStockInputSchema = z.object({
  stockSymbol: z.string().describe('The stock symbol to evaluate (e.g., AAPL).'),
  investmentStrategy: z.string().describe('The investment strategy to use (e.g., value investing, growth investing, income investing).'),
  userRiskProfile: z.string().optional().describe('Optional user risk profile (e.g., low, medium, high, aggressive, moderate, conservative).'),
});
export type RecommendStockInput = z.infer<typeof RecommendStockInputSchema>;

const RecommendStockOutputSchema = z.object({
  recommendation: z.string().describe('The recommendation (e.g., Buy, Sell, Hold, Strong Buy, Strong Sell).'),
  reasoning: z.string().describe('The reasoning behind the recommendation, based on the investment strategy, risk profile (if provided), and fetched data.'),
  strategyScore: z.number().min(0).max(100).describe('A numerical score (0-100) indicating how well the stock fits the specified strategy.'),
});
export type RecommendStockOutput = z.infer<typeof RecommendStockOutputSchema>;

export async function recommendStock(input: RecommendStockInput): Promise<RecommendStockOutput> {
  return recommendStockFlow(input);
}


// Tool to get current stock data - USES REAL API
const getCurrentStockDataTool = ai.defineTool({
  name: 'getCurrentStockDataForRecommendation',
  description: 'Retrieves the latest price, daily high, daily low, and company name for a given stock symbol from Yahoo Finance.',
  inputSchema: z.object({
    symbol: z.string().describe('The stock symbol (e.g., AAPL).'),
  }),
  // Matches the actual StockData interface
  outputSchema: z.object({
    symbol: z.string(),
    price: z.number(),
    dailyHigh: z.number(),
    dailyLow: z.number(),
    companyName: z.string(),
  }),
}, async ({ symbol }) => {
    try {
        console.log(`Recommendation Tool: Fetching stock data for ${symbol}...`);
        const data = await getStockData(symbol); // Call the real service function
        console.log(`Recommendation Tool: Stock data received for ${symbol}.`);
        return data;
    } catch (error: any) {
        console.error(`Recommendation Tool Error: Error fetching stock data for ${symbol}:`, error.message);
        throw new Error(`Failed to fetch stock data for ${symbol}. Reason: ${error.message}.`);
    }
});

// Tool to get company performance data - USES REAL API
const getCompanyPerformanceTool = ai.defineTool({
  name: 'getCompanyPerformanceDataForRecommendation',
  description: 'Retrieves key performance metrics like revenue (if available), EPS, and P/E ratio for a given stock symbol from Yahoo Finance.',
  inputSchema: z.object({
    symbol: z.string().describe('The stock symbol (e.g., AAPL).'),
  }),
  // Matches the actual CompanyPerformance interface
  outputSchema: z.object({
      symbol: z.string(),
      revenue: z.number().optional().nullable(), // Revenue is optional/nullable
      eps: z.number(),
      peRatio: z.number(), // Allow NaN
  }),
}, async ({ symbol }) => {
    try {
        console.log(`Recommendation Tool: Fetching company performance for ${symbol}...`);
        const data = await getCompanyPerformance(symbol); // Call the real service function
        console.log(`Recommendation Tool: Company performance received for ${symbol}.`);
        return data;
    } catch (error: any) {
        console.error(`Recommendation Tool Error: Error fetching company performance for ${symbol}:`, error.message);
        throw new Error(`Failed to fetch company performance data for ${symbol}. Reason: ${error.message}.`);
    }
});


// Tool specifically for evaluating the stock against the strategy and profile using the REAL data
// This tool's internal logic remains somewhat simplified for demonstration, but it now consumes real data structures.
const evaluateStockForStrategyTool = ai.defineTool({
  name: 'evaluateStockForStrategy',
  description: 'Evaluates how well a given stock aligns with a specific investment strategy and user risk profile, using provided real stock data and company performance metrics. Returns a recommendation, reasoning, and strategy fit score.',
  inputSchema: z.object({
    stockSymbol: z.string().describe('The stock symbol being evaluated.'),
    investmentStrategy: z.string().describe('The investment strategy provided.'),
    userRiskProfile: z.string().optional().describe('The user risk profile provided (if any).'),
    stockData: z.object({ // Matches REAL StockData structure
      symbol: z.string(),
      price: z.number(),
      dailyHigh: z.number(),
      dailyLow: z.number(),
      companyName: z.string(),
    }).describe('Current stock data for the symbol from Yahoo Finance.'),
    companyPerformance: z.object({ // Matches REAL CompanyPerformance structure
      symbol: z.string(),
      revenue: z.number().optional().nullable(),
      eps: z.number(),
      peRatio: z.number(), // Can be NaN
    }).describe('Company performance metrics for the symbol from Yahoo Finance.'),
  }),
  outputSchema: z.object({ // Matches RecommendStockOutputSchema
    recommendation: z.string().describe('The recommendation (e.g., Buy, Sell, Hold, Strong Buy, Strong Sell).'),
    reasoning: z.string().describe('Detailed reasoning linking the data, strategy, and risk profile to the recommendation.'),
    strategyScore: z.number().min(0).max(100).describe('A score (0-100) indicating alignment with the strategy.'),
  }),
}, async (input) => {
  // --- Simplified evaluation logic using REAL data fields ---
  let recommendation = 'Hold';
  let reasoning = `Analyzing ${input.stockSymbol} (${input.stockData.companyName}) for a ${input.investmentStrategy} strategy`;
   if (input.userRiskProfile) {
       reasoning += ` with a ${input.userRiskProfile} risk profile. `;
   } else {
       reasoning += `. `;
   }
   // Format PE and EPS carefully, handling potential NaN/null
   const peRatioFormatted = (typeof input.companyPerformance.peRatio === 'number' && !isNaN(input.companyPerformance.peRatio)) ? input.companyPerformance.peRatio.toFixed(2) : 'N/A';
   const epsFormatted = (typeof input.companyPerformance.eps === 'number') ? `$${input.companyPerformance.eps.toFixed(2)}` : 'N/A';
   const revenueFormatted = (typeof input.companyPerformance.revenue === 'number') ? `$${input.companyPerformance.revenue.toLocaleString()}` : 'N/A';

   reasoning += `Current Price: $${input.stockData.price.toFixed(2)}, P/E Ratio: ${peRatioFormatted}, EPS: ${epsFormatted}, Revenue: ${revenueFormatted}. `;

  let score = 50; // Start neutral

  // Simple logic based on strategy (using real data fields)
  // Note: P/E might be NaN
  if (input.investmentStrategy === 'value_investing') {
    if (typeof input.companyPerformance.peRatio === 'number' && !isNaN(input.companyPerformance.peRatio) && input.companyPerformance.peRatio < 18) {
      recommendation = 'Buy';
      reasoning += 'The P/E ratio is relatively low, suggesting potential value. ';
      score += 25;
    } else if (typeof input.companyPerformance.peRatio === 'number' && !isNaN(input.companyPerformance.peRatio) && input.companyPerformance.peRatio > 30) {
      recommendation = 'Sell';
      reasoning += 'The P/E ratio seems high for a value strategy. ';
      score -= 15;
    } else if (isNaN(input.companyPerformance.peRatio)) {
         reasoning += 'P/E ratio is not available (possibly negative earnings), making value assessment difficult based on P/E alone. ';
         score -= 5; // Slightly penalize lack of PE for value strategy
    } else {
        reasoning += 'The valuation based on P/E seems moderate. ';
    }
  } else if (input.investmentStrategy === 'growth_investing') {
     // Check for positive EPS and potentially revenue growth (revenue is optional)
    if (typeof input.companyPerformance.eps === 'number' && input.companyPerformance.eps > 1.5) { // Example threshold for positive EPS
      recommendation = 'Buy';
      reasoning += 'Positive EPS indicates profitability. ';
      score += 20;
       // Add bonus points if revenue is high (example)
       if (typeof input.companyPerformance.revenue === 'number' && input.companyPerformance.revenue > 10e9) {
            reasoning += 'Significant revenue suggests strong market presence. ';
           score += 15;
       }
    } else if (typeof input.companyPerformance.eps === 'number' && input.companyPerformance.eps <= 0) {
        recommendation = 'Hold';
        reasoning += 'Negative or zero EPS is a concern for growth. ';
        score -= 10;
    } else {
        reasoning += 'Growth indicators based on available data are average. ';
    }
  } else if (input.investmentStrategy === 'income_investing') {
      // This would typically involve checking dividend yield, which isn't in our current data.
      reasoning += `Income strategy analysis requires dividend data not currently available. Evaluating based on general stability. `;
      // Penalize score slightly due to lack of relevant data
      score -= 10;
      // Example: Favor companies with moderate PE and positive EPS for stability
      if (typeof input.companyPerformance.peRatio === 'number' && !isNaN(input.companyPerformance.peRatio) && input.companyPerformance.peRatio < 25 && input.companyPerformance.peRatio > 10 &&
          typeof input.companyPerformance.eps === 'number' && input.companyPerformance.eps > 0) {
          reasoning += 'Seems relatively stable based on P/E and EPS. ';
          recommendation = 'Hold'; // Cautious Hold for income without dividend info
          score += 15;
      }
  }
   else {
      reasoning += `Standard analysis applied for ${input.investmentStrategy}. `;
      score += (Math.random() - 0.5) * 10; // Add minor randomness
  }

  // Adjust based on risk profile (example)
  if (input.userRiskProfile) {
      if ((input.userRiskProfile.toLowerCase() === 'low' || input.userRiskProfile.toLowerCase() === 'conservative') && score > 60 && recommendation.includes('Buy')) {
           reasoning += `Considering the conservative profile, a 'Hold' might be safer despite positive indicators. `;
           recommendation = 'Hold';
           score -= 10;
      }
       if ((input.userRiskProfile.toLowerCase() === 'high' || input.userRiskProfile.toLowerCase() === 'aggressive') && score > 70 && recommendation === 'Buy') {
            reasoning += `Given the aggressive profile, this looks like a strong opportunity. `;
            recommendation = 'Strong Buy';
            score += 5;
       }
        if ((input.userRiskProfile.toLowerCase() === 'high' || input.userRiskProfile.toLowerCase() === 'aggressive') && score < 40 && recommendation === 'Sell') {
            reasoning += `Given the aggressive profile, selling might be premature unless fundamentals are very weak. Consider holding. `;
            recommendation = 'Hold'; // Less likely to sell on moderate weakness
            score += 5; // Slight score increase for holding potential upside
       }
  }


  score = Math.max(0, Math.min(100, Math.round(score))); // Clamp score between 0 and 100

  return {
    recommendation: recommendation,
    reasoning: reasoning.trim(),
    strategyScore: score,
  };
});


const recommendStockPrompt = ai.definePrompt({
  name: 'recommendStockPrompt',
  tools: [getCurrentStockDataTool, getCompanyPerformanceTool, evaluateStockForStrategyTool], // Include all necessary tools
  input: {
    schema: z.object({
      stockSymbol: z.string().describe('The stock symbol to evaluate (e.g., AAPL).'),
      investmentStrategy: z.string().describe('The investment strategy to use (e.g., value investing, growth investing).'),
      userRiskProfile: z.string().optional().describe('Optional user risk profile (e.g., aggressive, moderate, conservative).'),
      // Data is fetched by tools within the flow
    }),
  },
  output: {
    schema: RecommendStockOutputSchema, // Matches the flow's output
  },
  // The prompt guides the LLM on how to use the tools.
  prompt: `
    You need to provide a stock recommendation for {{{stockSymbol}}}.
    The user's desired investment strategy is {{{investmentStrategy}}}.
    {{#if userRiskProfile}}The user's risk profile is {{{userRiskProfile}}}.{{/if}}

    Instructions:
    1.  First, use the 'getCurrentStockDataForRecommendation' tool to get the latest stock price data for {{{stockSymbol}}}. Handle potential errors (e.g., invalid symbol) gracefully by noting the failure.
    2.  Then, use the 'getCompanyPerformanceDataForRecommendation' tool to get the latest company performance metrics (Revenue, EPS, P/E) for {{{stockSymbol}}}. Handle potential errors gracefully.
    3.  If EITHER data fetching step (1 or 2) fails, DO NOT proceed to step 4. Instead, return a 'Hold' recommendation with reasoning explaining that necessary data could not be fetched, and assign a strategyScore of 0.
    4.  If both data fetching steps were successful, use the 'evaluateStockForStrategy' tool. Pass the fetched stock data, company performance data, the stock symbol ('{{{stockSymbol}}}'), the investment strategy ('{{{investmentStrategy}}}'), and the user risk profile ('{{{userRiskProfile}}}' if provided, otherwise pass nothing/null for risk profile) to this tool.
    5.  Return the exact output provided by the 'evaluateStockForStrategy' tool. Do not add any other text or explanation. Make sure the output strictly follows the required JSON schema (recommendation, reasoning, strategyScore).
    `,
});


const recommendStockFlow = ai.defineFlow<
  typeof RecommendStockInputSchema,
  typeof RecommendStockOutputSchema
>({
  name: 'recommendStockFlow',
  inputSchema: RecommendStockInputSchema,
  outputSchema: RecommendStockOutputSchema,
}, async (input) => {
    console.log("Recommend Stock Flow Input:", input);

    // The prompt now orchestrates the tool calls. Genkit will handle fetching
    // data using the tools based on the prompt instructions before potentially calling
    // the evaluation tool. It also handles the error case where data fetching fails.

    const { output } = await recommendStockPrompt(input);

    if (!output) {
        console.error("Recommend Stock Flow: No output received from the prompt execution.");
        // This might happen if the prompt itself errors or if the LLM fails to generate valid JSON according to the schema
        // after potentially hitting the error path in the prompt logic (data fetch failure).
        // Return a generic error state or re-throw.
         return {
            recommendation: 'Error',
            reasoning: 'Failed to generate recommendation due to an internal error or inability to fetch required data.',
            strategyScore: 0,
         };
        // Or: throw new Error("Recommendation generation failed to produce an output.");
    }

     console.log("Recommend Stock Flow Output:", output);

     // Basic validation (already somewhat enforced by Zod output schema in prompt)
     if (!output.recommendation || !output.reasoning || output.strategyScore === undefined || typeof output.strategyScore !== 'number') {
        console.error("Recommend Stock Flow: Output is missing required fields or has incorrect types.");
         // Even if the LLM produced *something*, if it doesn't match the schema, return an error state.
         return {
            recommendation: 'Error',
            reasoning: 'Generated recommendation has an invalid format.',
            strategyScore: 0,
         };
        // Or: throw new Error("Generated recommendation is incomplete or has wrong types.");
     }


    return output;
});
