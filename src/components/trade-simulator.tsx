'use client';

import { useState, useEffect } from 'react'; // Import useEffect
import type { PortfolioItem } from '@/types';
import type { StockData } from '@/services/stock-data';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from "@/hooks/use-toast"
import { ShoppingCart, MinusCircle, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';


interface TradeSimulatorProps {
  stockData: StockData | null;
  portfolio: PortfolioItem[];
  virtualBalance: number;
  onTrade: (symbol: string, quantity: number, price: number, type: 'buy' | 'sell') => boolean; // Updated signature
}

export function TradeSimulator({ stockData, portfolio, virtualBalance, onTrade }: TradeSimulatorProps) {
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState<number | string>('');
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

    // Effect to reset quantity and error when stockData changes (i.e., new stock selected)
    useEffect(() => {
        setQuantity('');
        setError(null);
        // Optionally reset tradeType to 'buy' as well
        // setTradeType('buy');
    }, [stockData?.symbol]); // Depend on the symbol within stockData

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string or positive integers
    if (value === '' || /^[1-9]\d*$/.test(value)) {
       setQuantity(value);
       setError(null); // Clear error on valid input
    } else if (value === '0') {
        setError("Quantity must be greater than 0.");
        setQuantity(value);
    } else {
        setError("Please enter a valid positive number for quantity.");
         // Keep the last valid value or empty string
    }
  };

  const handleTrade = () => {
    setError(null); // Clear previous errors
    if (!stockData) {
      setError("No stock data available to trade.");
      return;
    }

    const numQuantity = Number(quantity);
    if (isNaN(numQuantity) || numQuantity <= 0 || !Number.isInteger(numQuantity)) {
      setError("Please enter a valid whole number quantity greater than 0.");
      return;
    }

    // onTrade now returns a boolean indicating success
    const success = onTrade(stockData.symbol, numQuantity, stockData.price, tradeType);

    if (success) {
        toast({
          title: "Trade Executed",
          description: `${tradeType === 'buy' ? 'Bought' : 'Sold'} ${numQuantity} shares of ${stockData.symbol} at $${stockData.price.toFixed(2)}`,
          variant: "default", // Or maybe a 'success' variant if defined
        });
       setQuantity(''); // Reset quantity only on successful trade
    }
    // If success is false, the `onTrade` function (in page.tsx) should have shown a specific error toast
  };

   const maxSellQuantity = portfolio.find(item => item.symbol === stockData?.symbol)?.quantity || 0;
   const canTrade = stockData && quantity !== '' && Number(quantity) > 0 && !error;


  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-semibold text-primary">
            <ShoppingCart className="mr-2 h-5 w-5" /> Manual Trade
        </CardTitle>
        <CardDescription>Buy or sell shares with your virtual currency.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup
          defaultValue="buy"
          value={tradeType}
          onValueChange={(value: 'buy' | 'sell') => setTradeType(value)}
          className="grid grid-cols-2 gap-4"
        >
          <div>
            <RadioGroupItem value="buy" id="buy" className="peer sr-only" />
            <Label
              htmlFor="buy"
              className={cn(
                  "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-secondary hover:text-secondary-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary",
                  "cursor-pointer transition-colors"
              )}
            >
             {/* Use text-success for the buy icon */}
             <PlusCircle className="mb-3 h-6 w-6 text-success" />
              Buy
            </Label>
          </div>
          <div>
            <RadioGroupItem value="sell" id="sell" className="peer sr-only" />
            <Label
              htmlFor="sell"
              className={cn(
                "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-secondary hover:text-secondary-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary",
                 "cursor-pointer transition-colors"
              )}
            >
               {/* Use text-destructive for the sell icon */}
               <MinusCircle className="mb-3 h-6 w-6 text-destructive" />
              Sell
            </Label>
          </div>
        </RadioGroup>

        <div>
          <Label htmlFor="quantity">Quantity</Label>
           <Input
            id="quantity"
            type="number" // Use number type but handle validation manually for better control
            placeholder="Enter number of shares"
            value={quantity}
            onChange={handleQuantityChange}
            min="1"
            step="1"
            className={error ? 'border-destructive focus-visible:ring-destructive' : ''}
            disabled={!stockData} // Disable if no stock is selected
            />
           {tradeType === 'sell' && stockData && (
             <p className="text-xs text-muted-foreground mt-1">
               Available to sell: {maxSellQuantity} shares of {stockData.symbol}
             </p>
           )}
        </div>

        {stockData && quantity !== '' && Number(quantity) > 0 && !isNaN(Number(quantity)) && ( // Ensure quantity is a valid number
          <div className="text-sm text-muted-foreground bg-secondary p-3 rounded-md">
            Estimated {tradeType === 'buy' ? 'Cost' : 'Proceeds'}:
            <span className="font-medium text-foreground ml-1">
                ${(Number(quantity) * stockData.price).toFixed(2)}
            </span>
             {tradeType === 'buy' && Number(quantity) * stockData.price > virtualBalance && (
                <span className="text-destructive ml-2">(Insufficient Balance)</span>
             )}
             {tradeType === 'sell' && Number(quantity) > maxSellQuantity && (
                 <span className="text-destructive ml-2">(Insufficient Shares)</span>
             )}
          </div>
        )}

         {error && <p className="text-sm font-medium text-destructive">{error}</p>}
      </CardContent>
      <CardFooter>
        <Button onClick={handleTrade} disabled={!canTrade} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
          {tradeType === 'buy' ? 'Place Buy Order' : 'Place Sell Order'}
        </Button>
      </CardFooter>
    </Card>
  );
}
