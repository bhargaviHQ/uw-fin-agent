import type { PortfolioItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrendingUp, TrendingDown, Minus, Package } from 'lucide-react';
import { cn } from '@/lib/utils'; // Import cn

interface PortfolioTrackerProps {
  portfolio: PortfolioItem[];
  virtualBalance: number; // Include virtual balance for total value calculation
}

export function PortfolioTracker({ portfolio, virtualBalance }: PortfolioTrackerProps) {

  const calculateTotalPortfolioValue = () => {
    return portfolio.reduce((total, item) => total + item.quantity * item.currentPrice, 0);
  };

  const calculateTotalValue = () => {
    return virtualBalance + calculateTotalPortfolioValue();
  };

  const calculateGainLoss = (item: PortfolioItem) => {
    return (item.currentPrice - item.purchasePrice) * item.quantity;
  };

  const calculateTotalGainLoss = () => {
     return portfolio.reduce((total, item) => total + calculateGainLoss(item), 0);
  };

  // Use specific classes for gain/loss colors
  const getGainLossColorClass = (value: number): string => {
    if (value > 0) return 'text-success'; // Green (using custom class from globals.css)
    if (value < 0) return 'text-destructive'; // Red
    return 'text-muted-foreground';
  };

   const getGainLossIcon = (value: number) => {
     const colorClass = getGainLossColorClass(value);
     if (value > 0) return <TrendingUp className={cn("h-4 w-4 ml-1 inline-block", colorClass)} />;
     if (value < 0) return <TrendingDown className={cn("h-4 w-4 ml-1 inline-block", colorClass)} />;
     return <Minus className={cn("h-4 w-4 ml-1 inline-block", colorClass)} />;
   };

   const totalPortfolioValue = calculateTotalPortfolioValue();
   const totalValue = calculateTotalValue();
   const totalGainLoss = calculateTotalGainLoss();


  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-semibold text-primary">
            <Package className="mr-2 h-5 w-5" /> Simulated Portfolio
        </CardTitle>
        <CardDescription>Track your virtual investments.</CardDescription>
         <div className="pt-4 flex flex-wrap justify-between items-center text-sm border-t mt-2 gap-y-2 gap-x-4"> {/* Allow wrapping */}
            <div className="flex-shrink-0">
                <span className="text-muted-foreground">Portfolio Value: </span>
                <span className="font-bold">
                    ${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
            </div>
             <div className="flex-shrink-0">
                <span className="text-muted-foreground">Total Gain/Loss: </span>
                <span className={cn("font-bold", getGainLossColorClass(totalGainLoss))}>
                    ${totalGainLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    {getGainLossIcon(totalGainLoss)}
                </span>
            </div>
             <div className="flex-shrink-0">
                <span className="text-muted-foreground">Account Value: </span>
                <span className="font-bold">
                    ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
            </div>
         </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Company</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Avg. Cost</TableHead>
                <TableHead className="text-right">Current Price</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead className="text-right">Gain/Loss</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {portfolio.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                    Your portfolio is empty. Make your first trade!
                  </TableCell>
                </TableRow>
              ) : (
                portfolio.map((item) => {
                  const totalValue = item.quantity * item.currentPrice;
                  const gainLoss = calculateGainLoss(item);
                  const gainLossColorClass = getGainLossColorClass(gainLoss);
                  return (
                    <TableRow key={item.symbol} className="hover:bg-secondary/50 transition-colors">
                      <TableCell className="font-medium">{item.symbol}</TableCell>
                      <TableCell className="truncate max-w-[150px]">{item.companyName}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">${item.purchasePrice.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${item.currentPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${totalValue.toFixed(2)}</TableCell>
                      <TableCell className={cn("text-right font-medium", gainLossColorClass)}>
                        ${gainLoss.toFixed(2)}
                         {getGainLossIcon(gainLoss)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
