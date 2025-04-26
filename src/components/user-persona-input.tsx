
'use client';

import { useState } from 'react';
import {
  generateInvestmentPersona,
  GenerateInvestmentPersonaInput,
  GenerateInvestmentPersonaOutput,
} from '@/ai/flows/generate-investment-persona';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Wand2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';


interface UserPersonaInputProps {
  onPersonaGenerated: (persona: GenerateInvestmentPersonaOutput | null) => void;
}

export function UserPersonaInput({ onPersonaGenerated }: UserPersonaInputProps) {
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGeneratePersona = async () => {
    if (!userInput.trim()) {
      setError("Please describe your investment goals and preferences.");
      return;
    }
    setLoading(true);
    setError(null);
    onPersonaGenerated(null); // Clear previous persona

    const input: GenerateInvestmentPersonaInput = {
      userInput: userInput,
    };

    try {
      const result = await generateInvestmentPersona(input);
      onPersonaGenerated(result);
       toast({
        title: 'Persona Generated',
        description: 'Your investment persona has been created.',
      });
    } catch (err) {
      console.error("Error generating persona:", err);
       const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
       setError(`Failed to generate persona: ${errorMessage}`);
       toast({
         title: 'Error',
         description: `Failed to generate persona: ${errorMessage}`,
         variant: 'destructive',
       });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-semibold text-primary">
          <User className="mr-2 h-5 w-5" /> Your Investment Profile
        </CardTitle>
        <CardDescription>
          Describe your investment goals, risk tolerance, timeline, and any preferences (e.g., "I want to save for retirement in 20 years, medium risk, interested in tech stocks"). The AI will create a persona for you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="user-description">Your Description</Label>
          <Textarea
            id="user-description"
            placeholder="e.g., Long-term growth, comfortable with moderate risk, focus on sustainable energy companies..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            rows={4}
            className="mt-1 bg-background"
            disabled={loading}
          />
        </div>

        {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}

      </CardContent>
      <CardFooter>
        <Button onClick={handleGeneratePersona} disabled={loading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
          {loading ? (
            'Generating Persona...'
          ) : (
            <>
              <Wand2 className="mr-2 h-4 w-4" /> Generate Persona
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

