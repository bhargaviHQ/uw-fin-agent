
'use client';

import type { GenerateInvestmentPersonaOutput } from '@/ai/flows/generate-investment-persona';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserCheck, Target, BarChart, Clock, DollarSign, Activity } from 'lucide-react';

interface UserPersonaDisplayProps {
  persona: GenerateInvestmentPersonaOutput | null;
}

export function UserPersonaDisplay({ persona }: UserPersonaDisplayProps) {
  if (!persona) {
    return null; // Don't render anything if no persona is generated
  }

  return (
    <Card className="shadow-lg rounded-lg bg-card border-primary/50">
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-semibold text-primary">
          <UserCheck className="mr-2 h-5 w-5" /> Generated Investment Persona
        </CardTitle>
        <CardDescription>Based on your input, here's your AI-generated profile.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground flex items-center"><Target className="mr-1.5 h-4 w-4" /> Investment Goals:</span>
          <Badge variant="secondary">{persona.investmentGoals}</Badge>
        </div>
         <div className="flex items-center justify-between">
          <span className="text-muted-foreground flex items-center"><BarChart className="mr-1.5 h-4 w-4" /> Risk Appetite:</span>
          <Badge variant="secondary">{persona.riskAppetite}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground flex items-center"><Clock className="mr-1.5 h-4 w-4" /> Time Horizon:</span>
          <Badge variant="secondary">{persona.timeHorizon}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground flex items-center"><DollarSign className="mr-1.5 h-4 w-4" /> Investment Amount:</span>
           <Badge variant="secondary">{persona.investmentAmount}</Badge>
        </div>
         <div className="flex items-center justify-between">
          <span className="text-muted-foreground flex items-center"><Activity className="mr-1.5 h-4 w-4" /> Investment Style:</span>
          <Badge variant="secondary">{persona.investmentStyle}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
