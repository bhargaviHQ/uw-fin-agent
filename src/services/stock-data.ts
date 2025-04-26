
'use server';
/**
 * @fileOverview Service functions for retrieving stock data, news, and company performance.
 * Uses yahoo-finance2 for stock/performance and direct fetch for NewsAPI.org news.
 */
import yahooFinance from 'yahoo-finance2';
import type { Quote } from 'yahoo-finance2/dist/esm/src/modules/quote';
import type { QuoteSummaryResult } from 'yahoo-finance2/dist/esm/src/modules/quoteSummary';
// NewsAPI library removed, will use fetch directly

// --- Types ---

/**
 * Represents real-time stock data.
 */
export interface StockData {
  /**
   * The stock symbol (e.g., AAPL).
   */
  symbol: string;
  /**
   * The current price of the stock.
   */
  price: number;
  /**
   * The daily high price of the stock.
   */
  dailyHigh: number;
  /**
   * The daily low price of the stock.
   */
  dailyLow: number;
  /**
   * The company name.
   */
  companyName: string;
}

/**
 * Represents a news article headline.
 */
export interface NewsHeadline {
    /**
     * The headline text.
     */
    title: string;
    /**
     * URL to the full article.
     */
    url: string;
    /**
     * Source of the news article.
     */
    source: string;
    /**
     * Publication date/time (ISO string).
     */
    publishedAt: string;
}


/**
 * Represents company performance metrics.
 */
export interface CompanyPerformance {
  /**
   * The stock symbol (e.g., AAPL).
   */
  symbol: string;
  /**
   * The latest quarterly revenue (Note: Often requires premium API or may be unavailable).
   * This field might be null or undefined.
   */
  revenue?: number | null;
  /**
   * The latest quarterly earnings per share (Trailing Twelve Months).
   */
  eps: number;
  /**
   * The price-to-earnings ratio (Trailing Twelve Months).
   */
  peRatio: number;
}

// --- NewsAPI Configuration ---
const NEWSAPI_KEY = process.env.NEWSAPI_KEY;
const NEWSAPI_ENDPOINT = 'https://newsapi.org/v2/everything';

if (!NEWSAPI_KEY) {
    console.warn("NEWSAPI_KEY environment variable not set. News fetching will be disabled.");
    // Set a flag to indicate the API key is missing, used in NewsDisplay component
    process.env.NEXT_PUBLIC_NEWSAPI_DISABLED = 'true';
} else {
     process.env.NEXT_PUBLIC_NEWSAPI_DISABLED = 'false';
}


// --- Stock Data (Yahoo Finance) ---

/**
 * Asynchronously retrieves real-time stock data for a given stock symbol using Yahoo Finance.
 * @param symbol The stock symbol to retrieve data for.
 * @returns A promise that resolves to a StockData object containing real-time stock information.
 * @throws Will throw an error if the API call fails or the symbol is invalid.
 */
export async function getStockData(symbol: string): Promise<StockData> {
    try {
        const quote = await yahooFinance.quote(symbol);

        if (!quote || !quote.regularMarketPrice) {
            throw new Error(`No valid quote data found for symbol: ${symbol}`);
        }

        const data: StockData = {
            symbol: quote.symbol,
            price: quote.regularMarketPrice,
            dailyHigh: quote.regularMarketDayHigh ?? quote.regularMarketPrice, // Fallback to current price if high is missing
            dailyLow: quote.regularMarketDayLow ?? quote.regularMarketPrice,   // Fallback to current price if low is missing
            companyName: quote.longName || quote.shortName || `${symbol} Name N/A`, // Use longName, fallback to shortName or symbol
        };
        return data;
    } catch (error: any) {
        console.error(`Error fetching stock data for ${symbol} from Yahoo Finance:`, error.message);
        // Re-throw a more specific error or handle as needed
        if (error.message.includes('404 Not Found')) {
             throw new Error(`Invalid stock symbol or data unavailable: ${symbol}`);
        }
        throw new Error(`Failed to fetch stock data for ${symbol}. Reason: ${error.message}`);
    }
}

/**
 * Asynchronously retrieves stock data for multiple symbols using Yahoo Finance.
 * @param symbols An array of stock symbols.
 * @returns A promise that resolves to an array of StockData objects. Symbols with errors will be excluded.
 */
export async function getMultipleStockData(symbols: string[]): Promise<StockData[]> {
  if (!symbols || symbols.length === 0) {
    return [];
  }
  try {
    const quotes = await yahooFinance.quote(symbols);
    const results: StockData[] = [];

    // Check if quotes is an array (multiple symbols) or an object (single symbol)
    const quoteArray = Array.isArray(quotes) ? quotes : [quotes];

    for (const quote of quoteArray) {
        if (quote && quote.regularMarketPrice && quote.symbol) {
             results.push({
                symbol: quote.symbol,
                price: quote.regularMarketPrice,
                dailyHigh: quote.regularMarketDayHigh ?? quote.regularMarketPrice,
                dailyLow: quote.regularMarketDayLow ?? quote.regularMarketPrice,
                companyName: quote.longName || quote.shortName || `${quote.symbol} Name N/A`,
            });
        } else {
             console.warn(`Skipping invalid quote data received for one of the symbols.`);
        }
    }
    return results;
  } catch (error: any) {
    console.error(`Error fetching multiple stock data from Yahoo Finance:`, error.message);
    // Return empty array or partial results if desired, for now return empty on error
    return [];
     // Or re-throw: throw new Error(`Failed to fetch multiple stock data. Reason: ${error.message}`);
  }
}


// --- Company Performance (Yahoo Finance) ---

/**
 * Asynchronously retrieves company performance metrics for a given stock symbol using Yahoo Finance.
 * Note: Revenue data might not be consistently available via free APIs.
 * @param symbol The stock symbol to retrieve metrics for.
 * @returns A promise that resolves to a CompanyPerformance object.
 * @throws Will throw an error if the API call fails or required data is missing.
 */
export async function getCompanyPerformance(symbol: string): Promise<CompanyPerformance> {
    try {
        // Fetch summary data which includes defaultKeyStatistics
        const summary = await yahooFinance.quoteSummary(symbol, {
             modules: ["defaultKeyStatistics", "summaryDetail", "financialData"] // Include necessary modules
        });

        if (!summary) {
            throw new Error(`No summary data found for symbol: ${symbol}`);
        }

        const defaultKeyStatistics = summary.defaultKeyStatistics;
        const summaryDetail = summary.summaryDetail;
        const financialData = summary.financialData;

        // P/E Ratio and EPS are often in summaryDetail or defaultKeyStatistics
        const peRatio = summaryDetail?.trailingPE ?? defaultKeyStatistics?.trailingPE;
        const eps = summaryDetail?.trailingEps ?? defaultKeyStatistics?.trailingEps;

        // Revenue is typically in financialData
        const revenue = financialData?.totalRevenue; // This might be null or undefined


        // Validate required fields
        if (eps === undefined || eps === null) {
             // Allow missing EPS but log warning
             console.warn(`EPS data is missing for symbol: ${symbol}.`);
             // Consider setting a default or special value like NaN if needed downstream
             // eps = NaN; // Or keep it as is (null/undefined) depending on consumer logic
        }
         if (peRatio === undefined || peRatio === null) {
            // Allow missing P/E for some cases (e.g., negative earnings) but maybe provide a default or indicator
            console.warn(`P/E ratio is missing for symbol: ${symbol}. Might be due to negative earnings.`);
             // Consider setting a default or special value like NaN if needed downstream
             // peRatio = NaN; // Or keep it as is (null/undefined) depending on consumer logic
         }


        const performance: CompanyPerformance = {
            symbol: symbol, // Use the input symbol as it's not always returned in response parts
            revenue: revenue, // Can be null/undefined
            // Use NaN if EPS is missing/null/undefined for numerical consistency
            eps: typeof eps === 'number' ? eps : NaN,
             // Use NaN if PE is missing/null/undefined for numerical consistency
            peRatio: typeof peRatio === 'number' ? peRatio : NaN,
        };

        return performance;
    } catch (error: any) {
        console.error(`Error fetching company performance for ${symbol} from Yahoo Finance:`, error.message);
        if (error.message.includes('404 Not Found')) {
             throw new Error(`Invalid stock symbol or data unavailable for performance: ${symbol}`);
        }
        throw new Error(`Failed to fetch company performance for ${symbol}. Reason: ${error.message}`);
    }
}


// --- News Headlines (NewsAPI.org via Fetch) ---

/**
 * Asynchronously retrieves recent news headlines related to a given stock symbol using NewsAPI.org via fetch.
 * Uses the company name associated with the symbol for better search results.
 * @param symbol The stock symbol to retrieve news for.
 * @returns A promise that resolves to an array of NewsHeadline objects.
 * @throws Will throw an error if the NewsAPI key is missing, the API call fails, or the symbol is invalid.
 */
export async function getNewsHeadlines(symbol: string): Promise<NewsHeadline[]> {
    if (!NEWSAPI_KEY) {
        console.error("NewsAPI key is missing. Cannot fetch news.");
        // Set flag indicating the service is disabled due to missing key
        process.env.NEXT_PUBLIC_NEWSAPI_DISABLED = 'true';
        // Return empty or throw error based on desired handling
        // throw new Error('NewsAPI key is missing.'); // Option: throw error
        return []; // Option: return empty list
    }
     // Ensure flag is false if key exists
     process.env.NEXT_PUBLIC_NEWSAPI_DISABLED = 'false';

    try {
        // 1. Get company name from stock data to improve news search relevance
        let companyName = symbol; // Default to symbol if name fetch fails
        let stockInfo: StockData | null = null;
        try {
            stockInfo = await getStockData(symbol); // Reuse existing function
            // Use the first word of the company name or the full name if short
            companyName = stockInfo.companyName.includes(' ') ? stockInfo.companyName.split(" ")[0] : stockInfo.companyName;
        } catch (nameError: any) {
            console.warn(`Could not fetch company name for news search (${symbol}): ${nameError.message}. Using symbol instead.`);
        }

        // 2. Construct NewsAPI query parameters
        const query = encodeURIComponent(`"${companyName}" OR ${symbol}`); // Search for exact company name or symbol
        const url = `${NEWSAPI_ENDPOINT}?q=${query}&language=en&sortBy=relevancy&pageSize=10&apiKey=${NEWSAPI_KEY}`;

        console.log(`Fetching news from NewsAPI URL: ${NEWSAPI_ENDPOINT}?q=${query}&...`);

        // 3. Make the request using fetch
        const response = await fetch(url, {
            method: 'GET',
             // Add cache control if needed, e.g., revalidate every 15 minutes
            next: { revalidate: 900 }
            // No headers needed for basic key auth with NewsAPI via query param
        });

        if (!response.ok) {
            // Attempt to parse error response from NewsAPI
            let errorBody = null;
            try {
                errorBody = await response.json();
            } catch (e) { /* Ignore parsing error */ }

            const statusText = errorBody?.message || response.statusText;
            const errorCode = errorBody?.code;

             // Specific error handling based on NewsAPI codes
             if (errorCode === 'apiKeyInvalid' || errorCode === 'apiKeyMissing') {
                 throw new Error('Invalid or missing NewsAPI key.');
             }
             if (errorCode === 'rateLimited') {
                 throw new Error('NewsAPI rate limit exceeded.');
             }

             throw new Error(`NewsAPI request failed: ${response.status} ${statusText}`);
        }

        const data = await response.json();

        if (!data.articles || data.articles.length === 0) {
            console.warn(`No news headlines found via NewsAPI for query: ${companyName} OR ${symbol}`);
            return [];
        }

        // 4. Map NewsAPI articles to our NewsHeadline interface
        const headlines: NewsHeadline[] = data.articles.map((article: any) => ({ // Use 'any' for external API structure flexibility
            title: article.title || 'No Title',
            url: article.url || '#',
            source: article.source?.name || 'Unknown Source',
            publishedAt: article.publishedAt || new Date().toISOString(), // Fallback to current time if missing
        }));

         // Optional: Sort by date descending if needed (sortBy=relevancy might not guarantee chronological order)
         // headlines.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

        return headlines;

    } catch (error: any) {
        console.error(`Error fetching news headlines for ${symbol} via NewsAPI fetch:`, error.message);
        // Re-throw specific or generic error
        // Let specific errors (like invalid key, rate limit) bubble up
        if (error.message.includes('Invalid or missing NewsAPI key') || error.message.includes('NewsAPI rate limit exceeded')) {
            throw error; // Re-throw specific known errors
        }
        // Throw a generic error for other fetch/network issues
        throw new Error(`Failed to fetch news headlines for ${symbol}. Reason: ${error.message}`);
    }
}

    