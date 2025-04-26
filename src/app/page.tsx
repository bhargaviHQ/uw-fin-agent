
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PortfolioItem } from '@/types';
import type { GenerateInvestmentPersonaOutput } from '@/ai/flows/generate-investment-persona';
import type { AgentTraderInput, AgentTraderOutput, TradeDecisionSchema } from '@/ai/flows/agent-trader'; // Import agent types
import { runAgentTrader } from '@/ai/flows/agent-trader'; // Import agent runner
import { Header } from '@/components/header';
import { VirtualBalance } from '@/components/virtual-balance';
import { StockDataDisplay } from '@/components/stock-data-display';
import { StockRecommendation } from '@/components/stock-recommendation';
import { PortfolioTracker } from '@/components/portfolio-tracker';
import { TradeSimulator } from '@/components/trade-simulator';
import { UserPersonaInput } from '@/components/user-persona-input';
import { UserPersonaDisplay } from '@/components/user-persona-display';
import { NewsDisplay } from '@/components/news-display'; // Import News Component
import { AgentDecisionLog } from '@/components/agent-decision-log'; // Import Agent Decision Log component
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select" // Import Select
import { Bot, AlertTriangle } from 'lucide-react';
import { getStockData, getMultipleStockData } from '@/services/stock-data'; // Use real API functions
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { STOCK_SYMBOLS } from '@/config/stocks'; // Import predefined stock list


// Initial state values
const INITIAL_BALANCE = 100000; // Start with $100,000 virtual currency
const INITIAL_PORTFOLIO: PortfolioItem[] = [
    // Example initial holding - Prices will be updated on load
     { symbol: 'MSFT', companyName: 'Microsoft Corp.', quantity: 10, purchasePrice: 400.00, currentPrice: 400.00 }, // Placeholder price
     { symbol: 'AAPL', companyName: 'Apple Inc.', quantity: 15, purchasePrice: 165.00, currentPrice: 165.00 }, // Placeholder price
];

// Symbols the agent will monitor (can be different from the sidebar list)
const MONITORED_SYMBOLS = ['AAPL', 'GOOG', 'MSFT', 'TSLA', 'AMZN']; // Example list

// Interface for logged agent decisions with timestamp
export interface LoggedTradeDecision extends TradeDecisionSchema {
    timestamp: Date;
}


export default function Home() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>(STOCK_SYMBOLS[0]); // Default to first symbol in list
  const [virtualBalance, setVirtualBalance] = useState<number>(INITIAL_BALANCE);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(INITIAL_PORTFOLIO);
  const [currentStockData, setCurrentStockData] = useState<any>(null); // For TradeSimulator and detail view (uses getStockData)
  const [userPersona, setUserPersona] = useState<GenerateInvestmentPersonaOutput | null>(null); // State for persona
  const [agentIsRunning, setAgentIsRunning] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [agentDecisionsLog, setAgentDecisionsLog] = useState<LoggedTradeDecision[]>([]); // State for agent decisions log
  const { toast } = useToast();


  // --- Data Fetching and Portfolio Update ---

  // Fetch data for the currently selected symbol (for display)
  const fetchDisplayData = useCallback(async () => {
    if (!selectedSymbol) return;
    try {
      // Use the real getStockData function
      const data = await getStockData(selectedSymbol);
      setCurrentStockData(data); // Update data for TradeSimulator/display
    } catch (error: any) {
      console.error(`Failed to fetch stock data for ${selectedSymbol}:`, error.message);
       setCurrentStockData(null); // Clear data on error
       toast({
         title: "Error",
         description: `Could not fetch data for ${selectedSymbol}: ${error.message}`,
         variant: "destructive",
       });
    }
  }, [selectedSymbol, toast]);

  // Update prices for all items in the portfolio using getMultipleStockData
   const updatePortfolioPrices = useCallback(async () => {
    const symbolsToUpdate = portfolio.map(item => item.symbol);
    if (symbolsToUpdate.length === 0) return;

    try {
        // Fetch data for multiple symbols at once
        const fetchedData = await getMultipleStockData(symbolsToUpdate);

        if (fetchedData.length === 0 && symbolsToUpdate.length > 0) {
            console.warn('Portfolio price update returned no data.');
            return;
        }

        // Create a map for quick lookup
        const priceMap = new Map(fetchedData.map(data => [data.symbol, data.price]));

        // Update portfolio state using functional update for safety
        setPortfolio(prevPortfolio => {
            let hasChanged = false;
            const updatedPortfolio = prevPortfolio.map(item => {
                const newPrice = priceMap.get(item.symbol);
                if (newPrice !== undefined && newPrice !== item.currentPrice) {
                    hasChanged = true;
                    return { ...item, currentPrice: newPrice };
                }
                return item; // Return unchanged item if no new price or price hasn't changed
            });

            // Only update state if any price actually changed
            return hasChanged ? updatedPortfolio : prevPortfolio;
        });

    } catch (error: any) {
         console.error(`Failed to update portfolio prices:`, error.message);
         // Show a more generic error toast for portfolio update failure
         toast({
             title: "Portfolio Update Error",
             description: "Could not refresh all portfolio prices. Some values may be outdated.",
             variant: "destructive",
         });
    }

   }, [portfolio, toast]); // Dependency on portfolio state

  // Initial fetch and periodic updates
  useEffect(() => {
    fetchDisplayData(); // Fetch data for the initially selected symbol
    updatePortfolioPrices(); // Update prices for existing portfolio items

    // Set up intervals for pseudo-real-time updates
    const displayDataInterval = setInterval(fetchDisplayData, 15000); // Refresh display data every 15s
    const portfolioPriceInterval = setInterval(updatePortfolioPrices, 30000); // Refresh portfolio prices every 30s

    return () => {
      clearInterval(displayDataInterval);
      clearInterval(portfolioPriceInterval);
    };
  }, [selectedSymbol, fetchDisplayData, updatePortfolioPrices]); // Ensure dependencies are correct

  // Handler for selecting a stock from the dropdown
  const handleSelectStock = (symbol: string) => {
    if (symbol) {
      setSelectedSymbol(symbol);
      setCurrentStockData(null); // Clear old data while new data loads
    }
  };

  // --- Manual Trade ---

 const handleManualTrade = (tradeSymbol: string, quantity: number, price: number, type: 'buy' | 'sell'): boolean => {
    const tradeValue = quantity * price;

     // Find the most up-to-date company name
     const currentDisplayData = currentStockData?.symbol === tradeSymbol ? currentStockData : null;
     const portfolioItem = portfolio.find(p => p.symbol === tradeSymbol);
     const companyName = currentDisplayData?.companyName || portfolioItem?.companyName || `${tradeSymbol} Company`; // Fallback


    if (type === 'buy') {
      if (tradeValue > virtualBalance) {
          toast({ title: "Trade Failed", description: "Insufficient balance.", variant: "destructive" });
          return false; // Indicate failure
      }
      // Use functional update for balance
      setVirtualBalance(prevBalance => prevBalance - tradeValue);
      setPortfolio(prevPortfolio => {
        const existingItemIndex = prevPortfolio.findIndex(item => item.symbol === tradeSymbol);
        let updatedPortfolio = [...prevPortfolio]; // Create a copy

        if (existingItemIndex > -1) {
          const existingItem = updatedPortfolio[existingItemIndex];
          const totalQuantity = existingItem.quantity + quantity;
          const totalCost = existingItem.purchasePrice * existingItem.quantity + tradeValue;
          updatedPortfolio[existingItemIndex] = {
            ...existingItem,
            quantity: totalQuantity,
            purchasePrice: totalCost / totalQuantity, // Recalculate average cost
            currentPrice: price, // Update current price to trade price
             companyName: companyName, // Ensure name is updated if it was missing
          };
        } else {
          updatedPortfolio = [ // Assign the new array
            ...updatedPortfolio,
            {
              symbol: tradeSymbol,
              companyName: companyName,
              quantity: quantity,
              purchasePrice: price,
              currentPrice: price,
            },
          ];
        }
         return updatedPortfolio; // Return the new state
      });
        return true; // Indicate success
    } else { // Sell
         const existingHolding = portfolio.find(item => item.symbol === tradeSymbol);
         if (!existingHolding || existingHolding.quantity < quantity) {
             toast({ title: "Trade Failed", description: `Not enough ${tradeSymbol} shares to sell. You own ${existingHolding?.quantity || 0}.`, variant: "destructive" });
             return false; // Indicate failure
         }
      // Use functional update for balance
      setVirtualBalance(prevBalance => prevBalance + tradeValue);
      setPortfolio(prevPortfolio => {
        const existingItemIndex = prevPortfolio.findIndex(item => item.symbol === tradeSymbol);
        let updatedPortfolio = [...prevPortfolio]; // Create a copy

        // Validation already done, existingItemIndex will be > -1
        const existingItem = updatedPortfolio[existingItemIndex];
        if (existingItem.quantity === quantity) {
          // Remove item if selling all shares
          updatedPortfolio.splice(existingItemIndex, 1);
        } else {
          // Update quantity if selling partial shares
          updatedPortfolio[existingItemIndex] = {
            ...existingItem,
            quantity: existingItem.quantity - quantity,
            currentPrice: price, // Update current price to trade price
          };
        }
         return updatedPortfolio; // Return the new state
      });
        return true; // Indicate success
    }
  };


  // --- Agent Trading ---

 const executeAgentTrade = async (decision: z.infer<typeof TradeDecisionSchema>) => {
      let tradeSuccess = false;
      if (decision.action === 'buy' && decision.quantity && decision.symbol && decision.quantity > 0) {
         try {
            // Fetch latest price right before potential trade for accuracy
            const latestData = await getStockData(decision.symbol);
            tradeSuccess = handleManualTrade(decision.symbol, decision.quantity, latestData.price, 'buy');
             if(!tradeSuccess) {
                 // handleManualTrade already shows a toast on failure (e.g., insufficient balance)
                 // Optionally add a log or different indicator for agent-specific failures
                 console.warn(`Agent BUY action for ${decision.symbol} failed execution (e.g., insufficient balance).`);
                 toast({ title: `Agent Action Failed: BUY ${decision.symbol}`, description: `Could not execute buy order. See logs for details.`, variant: "destructive" });
             }
         } catch (e: any) {
              console.error(`Agent BUY ${decision.symbol}: Error fetching price or executing trade:`, e);
              toast({ title: `Agent Trade Error (BUY ${decision.symbol})`, description: `Error executing buy: ${e.message}`, variant: "destructive" });
         }

      } else if (decision.action === 'sell' && decision.quantity && decision.symbol && decision.quantity > 0) {
         const stockToSell = portfolio.find(p => p.symbol === decision.symbol);
         if (!stockToSell) {
             console.warn(`Agent SELL ${decision.symbol}: Stock not in portfolio. Skipping trade.`);
             // Maybe add a toast here if needed, but log might be sufficient
             // toast({ title: `Agent Trade Skipped (${decision.symbol})`, description: `Stock not found in portfolio. Reason: ${decision.reasoning}`, variant: "destructive" });
             return; // Skip if not holding
         }

         // Adjust quantity if agent tries to sell more than owned
         const sellQuantity = Math.min(decision.quantity, stockToSell.quantity);
         if (sellQuantity < decision.quantity) {
            // Log adjustment, toast optional
            console.warn(`Agent SELL ${decision.symbol}: Adjusted quantity from ${decision.quantity} to ${sellQuantity} (available shares).`);
            // toast({ title: `Agent Sell Adjusted (${decision.symbol})`, description: `Attempted to sell ${decision.quantity}, selling available ${sellQuantity} shares instead.`, variant: "default" });
         }

         // Use the most recent price for selling (from portfolio state, which should be frequently updated)
         tradeSuccess = handleManualTrade(decision.symbol, sellQuantity, stockToSell.currentPrice, 'sell');
          if(!tradeSuccess) {
              // handleManualTrade already shows a toast on failure
              console.warn(`Agent SELL action for ${decision.symbol} failed execution.`);
              toast({ title: `Agent Action Failed: SELL ${decision.symbol}`, description: `Could not execute sell order. See logs for details.`, variant: "destructive" });
          }
      }
      // No specific action needed for 'hold' or corrected invalid quantity (0)
      // These are logged in the decision log component.
  };


 const handleRunAgent = async () => {
    if (!userPersona) {
      toast({
        title: "Cannot Run Agent",
        description: "Please generate an investment persona first.",
        variant: "destructive",
      });
      return;
    }
    setAgentIsRunning(true);
    setAgentError(null);
    setAgentDecisionsLog([]); // Clear previous logs when running agent again

    // Ensure portfolio has reasonably current prices before sending to agent
    // The agent itself will fetch the absolute latest prices via tools
    await updatePortfolioPrices(); // Make sure this updates the portfolio state

    // Need to wait for state update before proceeding
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to allow state update

    // Pass the latest state to the agent
    const agentInput: AgentTraderInput = {
      userPersona: userPersona,
      currentPortfolio: portfolio.map(p => ({ ...p })), // Pass a fresh copy of the latest state
      virtualBalance: virtualBalance,
      monitoredSymbols: MONITORED_SYMBOLS,
    };

    try {
      toast({ title: "Agent Running", description: "AI is analyzing market data and news..." });
      console.log("Running agent with input:", JSON.stringify(agentInput, null, 2));
      const result: AgentTraderOutput = await runAgentTrader(agentInput); // Agent uses tools for real-time data

      // Log decisions with timestamps
      const decisionsWithTimestamp: LoggedTradeDecision[] = result.tradeDecisions.map(d => ({
          ...d,
          timestamp: new Date(),
      }));
      setAgentDecisionsLog(decisionsWithTimestamp); // Update the log state

       if (decisionsWithTimestamp.length > 0) {
            toast({ title: "Agent Decisions Received", description: `Agent made ${decisionsWithTimestamp.length} decisions. Executing trades...` });
             // Execute trades sequentially with a small delay for simulation/UX
             for (let i = 0; i < decisionsWithTimestamp.length; i++) {
                  const decision = decisionsWithTimestamp[i];
                  await new Promise(resolve => setTimeout(resolve, 500)); // Short delay between decisions
                  await executeAgentTrade(decision); // Wait for trade execution attempt
             }
            toast({ title: "Agent Finished", description: `Agent has finished executing trades. Check the decision log.` });
       } else {
           toast({ title: "Agent Completed", description: "No immediate trade actions recommended based on current analysis." });
       }

        if (result.overallStrategyAdjustment) {
            // Optionally add strategy adjustment to the log or show a separate toast
            setAgentDecisionsLog(prevLog => [
                ...prevLog,
                 {
                    action: 'info', // Custom action type for log display
                    symbol: 'Strategy',
                    reasoning: result.overallStrategyAdjustment ?? '',
                    timestamp: new Date(),
                    quantity: undefined,
                    confidenceScore: undefined
                 } as unknown as LoggedTradeDecision // Type assertion needed if using custom action
            ]);
            toast({ title: "Agent Strategy Suggestion", description: result.overallStrategyAdjustment });
        }

    } catch (err) {
      console.error("Error running agent trader:", err);
       const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setAgentError(`Agent failed: ${errorMessage}`);
      toast({
        title: "Agent Error",
        description: `Agent failed: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setAgentIsRunning(false);
    }
  };

  // --- Render ---

  return (
      <div className="flex flex-col min-h-screen bg-secondary">
        <Header />
        <div className="flex flex-1">
           {/* Main Content Area */}
            <main className="flex-grow container mx-auto p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8">

              {/* Top Row: Stock Selector, Balance */}
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-end mb-6">
                <div className="flex-grow w-full md:w-auto">
                  <Label htmlFor="stock-symbol-select" className="text-sm font-medium mb-1 block">Select Stock</Label>
                  <Select value={selectedSymbol} onValueChange={handleSelectStock}>
                    <SelectTrigger id="stock-symbol-select" className="bg-background w-full md:w-[200px]">
                      <SelectValue placeholder="Select a stock" />
                    </SelectTrigger>
                    <SelectContent>
                      {STOCK_SYMBOLS.map((symbol) => (
                        <SelectItem key={symbol} value={symbol}>
                          {symbol}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full md:w-auto md:ml-auto">
                  <VirtualBalance balance={virtualBalance} />
                </div>
              </div>

              {/* Middle Row: Persona Input/Display and Agent Control */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                <UserPersonaInput onPersonaGenerated={setUserPersona} />
                <div className="space-y-4">
                    <UserPersonaDisplay persona={userPersona} />
                    {/* Update Run Agent Button variant to 'accent' */}
                    <Button
                      onClick={handleRunAgent}
                      disabled={agentIsRunning || !userPersona}
                      variant="accent" // Use accent variant (gold)
                      className="w-full" // Remove explicit colors, rely on variant
                    >
                      {agentIsRunning ? (
                          'Agent Running...'
                      ) : (
                          <>
                              <Bot className="mr-2 h-4 w-4" /> Run Trading Agent (Simulated)
                          </>
                      )}
                      </Button>
                      {agentError && (
                          <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Agent Error</AlertTitle>
                          <AlertDescription>{agentError}</AlertDescription>
                          </Alert>
                      )}
                </div>
              </div>

              {/* Agent Decision Log - Display below agent controls */}
              <div className="mt-8">
                  <AgentDecisionLog decisions={agentDecisionsLog} />
              </div>


              {/* Bottom Row: Stock Details, News, Manual Trade, Recommendation */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 mt-8"> {/* Added mt-8 */}
                <div className="lg:col-span-1 space-y-6 md:space-y-8">
                  {/* Stock Data Display for the selected symbol */}
                  <StockDataDisplay symbol={selectedSymbol} />
                </div>
                 <div className="lg:col-span-1 space-y-6 md:space-y-8">
                    {/* News Display for the selected symbol */}
                   <NewsDisplay symbol={selectedSymbol} />
                 </div>
                <div className="lg:col-span-1 space-y-6 md:space-y-8">
                  {/* Trade Simulator for the selected symbol */}
                  <TradeSimulator
                      stockData={currentStockData} // Pass the fetched data for the selected symbol
                      portfolio={portfolio}
                      virtualBalance={virtualBalance}
                      onTrade={handleManualTrade} // Use manual trade handler
                  />
                   {/* Recommendation for the selected symbol */}
                   <StockRecommendation symbol={selectedSymbol} userPersona={userPersona}/>
                </div>
              </div>

              {/* Portfolio Tracker - Full Width Below */}
              <div className="mt-8">
                <PortfolioTracker portfolio={portfolio} virtualBalance={virtualBalance} />
              </div>
            </main>
        </div>
      </div>
  );
}
