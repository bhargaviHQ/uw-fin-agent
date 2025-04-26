
'use client';

import { useState, useEffect } from 'react';
import type { StockData, CompanyPerformance } from '@/services/stock-data';
import { getStockData, getCompanyPerformance } from '@/services/stock-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus, Building, BarChartBig, Percent, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils'; // Import cn

interface StockDataDisplayProps {
  symbol: string;
}

export function StockDataDisplay({ symbol }: StockDataDisplayProps) {
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [companyPerformance, setCompanyPerformance] = useState<CompanyPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previousPrice, setPreviousPrice] = useState<number | undefined>(undefined); // State to hold previous price for trend icon

  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates on unmounted component

    async function fetchData() {
      if (!symbol) {
        setStockData(null);
        setCompanyPerformance(null);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      // Preserve previous price before fetching new data
      setPreviousPrice(prev => stockData?.price ?? prev); // Keep existing price if stockData is null

      try {
        const [stock, performance] = await Promise.all([
          getStockData(symbol).catch(e => { console.error(`Error fetching stock data for ${symbol}:`, e.message); return null; }), // Catch individual errors
          getCompanyPerformance(symbol).catch(e => { console.error(`Error fetching performance data for ${symbol}:`, e.message); return null; }),
        ]);

         if (!isMounted) return; // Don't update state if component unmounted

        if (stock === null) {
             // Keep previous data if stock fetch fails, but show error?
             // Or clear data and show error? Let's clear and show error.
             setStockData(null);
             setCompanyPerformance(null);
             throw new Error(`Failed to fetch stock data for ${symbol}.`);
        }

         // Performance data might be unavailable for some symbols or APIs, handle gracefully
         if (performance === null) {
            console.warn(`Performance data unavailable for ${symbol}.`);
         }

        setStockData(stock);
        setCompanyPerformance(performance); // Can be null

      } catch (err: any) {
         if (!isMounted) return;
        console.error("Error fetching stock details:", err.message);
        setError(err.message || 'Failed to fetch stock details. Please check the symbol or try again.');
        setStockData(null); // Clear data on error
        setCompanyPerformance(null);
         setPreviousPrice(undefined); // Clear previous price on error too
      } finally {
         if (isMounted) {
           setLoading(false);
         }
      }
    }

    fetchData();

    // Set up an interval to refresh data periodically
    const intervalId = setInterval(fetchData, 15000); // Refresh every 15 seconds

    // Cleanup function
    return () => {
        isMounted = false; // Set flag on unmount
        clearInterval(intervalId);
        // Don't reset previous price here, do it on symbol change or error
    };
  }, [symbol]); // Re-run effect when symbol changes


  // Use specific color classes for icons
  const getPriceChangeIcon = (currentPrice: number | undefined, prevPrice: number | undefined) => {
    if (currentPrice === undefined || prevPrice === undefined) return <Minus className="h-5 w-5 text-muted-foreground" />; // Show neutral if data is missing
    if (currentPrice > prevPrice) return <TrendingUp className="h-5 w-5 text-success" />; // Use text-success (green)
    if (currentPrice < prevPrice) return <TrendingDown className="h-5 w-5 text-destructive" />; // Use text-destructive (red)
    return <Minus className="h-5 w-5 text-muted-foreground" />; // Prices are equal
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" /> {/* Added skeleton for Revenue */}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !stockData) { // Only show full error card if no data is available at all
    return (
      <Card>
        <CardHeader className="flex flex-row items-center space-x-2 text-destructive">
             <AlertTriangle className="h-5 w-5" />
             <CardTitle>Error Loading Data</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
        </CardContent>
      </Card>
    );
  }

    // Show placeholder/message if symbol is valid but no data could be fetched after loading
    if (!stockData) {
        return (
          <Card>
            <CardHeader>
                <CardTitle>No Data Available</CardTitle>
                 <CardDescription>Could not fetch data for {symbol}.</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Please check the symbol or try again later. {error}</p>
            </CardContent>
          </Card>
        );
    }

  // If there's data, render it, even if there was a temporary error on the last fetch
  return (
    <Card className="shadow-lg rounded-lg transition-all duration-300 hover:shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
            <div>
                <CardTitle className="text-xl md:text-2xl font-bold text-primary flex items-center">
                    <Building className="mr-2 h-5 w-5 md:h-6 md:w-6" /> {stockData.companyName} ({stockData.symbol})
                </CardTitle>
                <CardDescription>Real-time stock data and performance</CardDescription>
             </div>
             {/* Use state for previous price comparison */}
             {getPriceChangeIcon(stockData?.price, previousPrice)}
        </div>
         {/* Show error inline if data exists but last fetch failed */}
          {error && (
              <p className="text-xs text-destructive mt-1">Error refreshing data: {error}</p>
          )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-3xl font-bold text-foreground"> {/* Use foreground, icon shows trend */}
          ${stockData.price?.toFixed(2) ?? 'N/A'}
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">High:</span>
            <span className="font-medium">${stockData.dailyHigh?.toFixed(2) ?? 'N/A'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Low:</span>
            <span className="font-medium">${stockData.dailyLow?.toFixed(2) ?? 'N/A'}</span>
          </div>

           {/* Conditionally render performance metrics if available */}
           {companyPerformance ? (
            <>
                <div className="flex items-center justify-between col-span-2 pt-2 border-t">
                    <span className="text-muted-foreground flex items-center"><BarChartBig className="mr-1 h-4 w-4" /> Revenue (TTM):</span>
                    <span className="font-medium">
                        {companyPerformance.revenue ? `$${companyPerformance.revenue.toLocaleString()}` : 'N/A'}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">EPS (TTM):</span>
                     {/* Check if EPS is a valid number before formatting */}
                     <span className="font-medium">
                         {typeof companyPerformance.eps === 'number' ? `$${companyPerformance.eps.toFixed(2)}` : 'N/A'}
                     </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center"><Percent className="mr-1 h-4 w-4" /> P/E Ratio (TTM):</span>
                     {/* Check if PE is a valid number before formatting */}
                    <span className="font-medium">
                         {typeof companyPerformance.peRatio === 'number' && !isNaN(companyPerformance.peRatio)
                           ? companyPerformance.peRatio.toFixed(2)
                           : 'N/A'}
                    </span>
                </div>
             </>
            ) : (
                 <div className="col-span-2 pt-2 border-t text-center text-muted-foreground text-xs">
                    Performance metrics currently unavailable.
                 </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
