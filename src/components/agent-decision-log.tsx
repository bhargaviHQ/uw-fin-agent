
'use client';

import type { LoggedTradeDecision } from '@/app/page'; // Import the extended type
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Bot, TrendingUp, TrendingDown, Minus, Info, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns'; // For relative timestamps
import { cn } from '@/lib/utils';

interface AgentDecisionLogProps {
  decisions: LoggedTradeDecision[];
}

export function AgentDecisionLog({ decisions }: AgentDecisionLogProps) {

  const getActionIcon = (action: string | undefined) => {
    const lowerAction = action?.toLowerCase();
    switch (lowerAction) {
      case 'buy':
        return <TrendingUp className="h-4 w-4 text-success mr-2 flex-shrink-0" />;
      case 'sell':
        return <TrendingDown className="h-4 w-4 text-destructive mr-2 flex-shrink-0" />;
      case 'hold':
        return <Minus className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />;
      case 'info': // For strategy adjustments or other info
         return <Info className="h-4 w-4 text-blue-500 mr-2 flex-shrink-0" />;
      default:
        return <Bot className="h-4 w-4 text-primary mr-2 flex-shrink-0" />; // Default icon
    }
  };

  const getActionColorClass = (action: string | undefined): string => {
      const lowerAction = action?.toLowerCase();
      if (lowerAction === 'buy') return 'text-success';
      if (lowerAction === 'sell') return 'text-destructive';
      if (lowerAction === 'info') return 'text-blue-500';
      return 'text-foreground'; // Default for hold/other
  };

  const getConfidenceColorClass = (score: number | undefined): string => {
     if (score === undefined || score === null) return 'text-muted-foreground';
     if (score >= 0.75) return 'text-success';
     if (score >= 0.5) return 'text-yellow-600'; // Consider adding a warning color
     return 'text-destructive';
  };

  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-semibold text-primary">
          <Bot className="mr-2 h-5 w-5" /> Agent Decision Log
        </CardTitle>
        <CardDescription>History of decisions made by the trading agent.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] w-full pr-4">
          {decisions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Clock className="h-8 w-8 mb-2" />
              <p>No agent decisions recorded yet.</p>
              <p className="text-sm">Run the agent to see its actions here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {decisions.slice().reverse().map((decision, index) => ( // Reverse to show newest first
                <div key={index} className="p-3 border rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                     <div className="flex items-center">
                         {getActionIcon(decision.action)}
                         <span className={cn("font-semibold text-base mr-2", getActionColorClass(decision.action))}>
                            {decision.action.toUpperCase()}
                         </span>
                         <Badge variant="outline" className="mr-2">{decision.symbol}</Badge>
                          {decision.quantity && decision.action !== 'hold' && (
                             <span className="text-sm text-muted-foreground">({decision.quantity} shares)</span>
                          )}
                     </div>
                     <span className="text-xs text-muted-foreground whitespace-nowrap" title={decision.timestamp.toLocaleString()}>
                        {formatDistanceToNow(decision.timestamp, { addSuffix: true })}
                    </span>
                  </div>
                   <p className="text-sm text-muted-foreground mb-1">{decision.reasoning}</p>
                   {decision.confidenceScore !== undefined && decision.action !== 'info' && (
                     <div className="text-xs text-right">
                        Confidence: <span className={cn("font-medium", getConfidenceColorClass(decision.confidenceScore))}>{(decision.confidenceScore * 100).toFixed(0)}%</span>
                     </div>
                   )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
