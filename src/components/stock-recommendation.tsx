
'use client';

import { useState, useEffect } from 'react';
import { recommendStock, RecommendStockInput, RecommendStockOutput } from '@/ai/flows/recommend-stock';
import type { GenerateInvestmentPersonaOutput } from '@/ai/flows/generate-investment-persona'; // Import persona type
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Lightbulb, TrendingUp, AlertTriangle, BarChartHorizontalBig } from 'lucide-react';
import { cn } from '@/lib/utils'; // Import cn

interface StockRecommendationProps {
  symbol: string;
  userPersona: GenerateInvestmentPersonaOutput | null; // Accept optional persona
}

const investmentStrategies = [
  { value: 'value_investing', label: 'Value Investing' },
  { value: 'growth_investing', label: 'Growth Investing' },
  { value: 'income_investing', label: 'Income Investing' },
  { value: 'momentum_investing', label: 'Momentum Investing' },
  // Add more relevant strategies if needed
];

export function StockRecommendation({ symbol, userPersona }: StockRecommendationProps) {
  const [recommendation, setRecommendation] = useState<RecommendStockOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<string>(investmentStrategies[0].value);

  // Reset recommendation when symbol changes
  useEffect(() => {
    setRecommendation(null);
    setError(null);
    // Optionally set default strategy based on persona when symbol changes
    if (userPersona?.investmentStyle) {
        const matchingStrategy = investmentStrategies.find(s => s.label.toLowerCase().includes(userPersona.investmentStyle.toLowerCase()));
        if (matchingStrategy) {
            setSelectedStrategy(matchingStrategy.value);
        } else {
             setSelectedStrategy(investmentStrategies[0].value); // Default if no match
        }
    } else {
         setSelectedStrategy(investmentStrategies[0].value); // Default if no persona
    }

  }, [symbol, userPersona]); // Add userPersona as dependency

  const handleGetRecommendation = async () => {
    if (!symbol) {
      setError("Please ensure a stock symbol is entered.");
      return;
    }
     if (!selectedStrategy) {
        setError("Please select an investment strategy.");
        return;
    }
    setLoading(true);
    setError(null);
    setRecommendation(null);

    const input: RecommendStockInput = {
      stockSymbol: symbol,
      investmentStrategy: selectedStrategy,
      // Pass user risk profile from persona if available
      userRiskProfile: userPersona?.riskAppetite,
    };

    try {
      const result = await recommendStock(input);
      setRecommendation(result);
    } catch (err) {
      console.error("Error getting recommendation:", err);
       const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to get recommendation: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Use specific classes for recommendation colors
  const getRecommendationColorClass = (rec: string | undefined): string => {
    if (!rec) return 'text-muted-foreground';
    const lowerRec = rec.toLowerCase();
    if (lowerRec.includes('buy')) return 'text-success'; // Green for Buy/Strong Buy
    if (lowerRec.includes('sell')) return 'text-destructive'; // Red for Sell/Strong Sell
    if (lowerRec === 'hold') return 'text-primary'; // Use primary color for Hold
    return 'text-muted-foreground'; // Default
  };

   const renderLoadingState = () => (
     <div className="space-y-4 pt-4 border-t mt-4">
       <div className="flex items-center justify-between">
         <Skeleton className="h-6 w-1/3" />
         <Skeleton className="h-6 w-1/4" />
       </div>
       <div>
         <Skeleton className="h-4 w-1/4 mb-2" />
         <Skeleton className="h-2.5 w-full" />
          <Skeleton className="h-4 w-1/5 mt-1 ml-auto" />
       </div>
       <div>
         <Skeleton className="h-4 w-1/4 mb-2" />
         <Skeleton className="h-16 w-full" />
       </div>
     </div>
   );


  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-semibold text-primary">
           <Lightbulb className="mr-2 h-5 w-5" /> Manual Stock Recommendation
        </CardTitle>
        <CardDescription>Get an AI recommendation for the selected stock based on a chosen strategy{userPersona ? ' and your profile' : ''}.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="investment-strategy">Investment Strategy</Label>
          <Select value={selectedStrategy} onValueChange={setSelectedStrategy} disabled={loading}>
            <SelectTrigger id="investment-strategy">
              <SelectValue placeholder="Select a strategy" />
            </SelectTrigger>
            <SelectContent>
              {investmentStrategies.map((strategy) => (
                <SelectItem key={strategy.value} value={strategy.value}>
                  {strategy.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
           {userPersona?.investmentStyle && (
               <p className="text-xs text-muted-foreground mt-1">
                   Default strategy based on your persona: {userPersona.investmentStyle}
               </p>
           )}
        </div>

        {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}

        {loading && renderLoadingState()}


        {recommendation && !loading && (
          <div className="space-y-4 pt-4 border-t mt-4">
             <div className="flex items-center justify-between">
                 <h3 className="text-lg font-semibold">Recommendation:</h3>
                 {/* Apply specific color class and bold for strong recommendations */}
                 <span className={cn(
                    "text-xl font-bold",
                    getRecommendationColorClass(recommendation.recommendation),
                    (recommendation.recommendation.toLowerCase().includes('strong')) && 'font-extrabold' // Example: extra bold for "strong"
                 )}>
                    {recommendation.recommendation}
                </span>
             </div>

             <div>
                <h4 className="font-semibold flex items-center"><BarChartHorizontalBig className="mr-2 h-4 w-4" /> Strategy Score:</h4>
                {/* Use accent color for the progress bar */}
                <div className="w-full bg-secondary rounded-full h-2.5 mt-1 relative overflow-hidden">
                  <div
                    className="bg-accent h-2.5 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${recommendation.strategyScore}%` }}
                  />
                </div>
                <p className="text-sm text-right mt-1 text-muted-foreground">{recommendation.strategyScore}/100 Fit</p>
             </div>

            <div>
              <h4 className="font-semibold">Reasoning:</h4>
              <p className="text-sm text-muted-foreground bg-secondary p-3 rounded-md">{recommendation.reasoning}</p>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
         {/* Use accent color for the button */}
        <Button onClick={handleGetRecommendation} disabled={loading || !symbol || !selectedStrategy} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
          {loading ? 'Analyzing...' : 'Get AI Recommendation'}
        </Button>
      </CardFooter>
    </Card>
  );
}
