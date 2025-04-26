
'use client';

import { useState, useEffect } from 'react';
import type { NewsHeadline } from '@/services/stock-data';
import { getNewsHeadlines } from '@/services/stock-data'; // This now uses NewsAPI
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExternalLink, Newspaper, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns'; // For relative time formatting

interface NewsDisplayProps {
  symbol: string;
}

export function NewsDisplay({ symbol }: NewsDisplayProps) {
  const [headlines, setHeadlines] = useState<NewsHeadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true; // Prevent state update on unmounted component

    async function fetchNews() {
      if (!symbol) {
        setHeadlines([]);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      setHeadlines([]); // Clear previous headlines

      try {
        // Call the updated function which now hits NewsAPI.org
        const news = await getNewsHeadlines(symbol);
         if (isMounted) {
            // Check if the error is due to missing API key
             if (news.length === 0 && process.env.NEXT_PUBLIC_NEWSAPI_DISABLED) {
                 setError("NewsAPI key not configured. News display is disabled.");
             } else {
                setHeadlines(news);
             }
         }
      } catch (err: any) {
         if (isMounted) {
           console.error(`Error fetching news for ${symbol}:`, err.message);
           // Display specific errors like invalid key or rate limit
           if (err.message.includes('Invalid or missing NewsAPI key')) {
               setError('News feed disabled: Invalid or missing NewsAPI key.');
           } else if (err.message.includes('NewsAPI rate limit exceeded')) {
                setError('News feed temporarily unavailable (rate limit).');
           } else {
               setError(err.message || 'Failed to fetch news headlines.');
           }
         }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchNews();

     // Cleanup function
     return () => {
       isMounted = false;
     };

  }, [symbol]);

  const renderLoadingState = () => (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="p-3 border rounded-md space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-1/4 ml-auto" />
        </div>
      ))}
    </div>
  );

  const renderErrorState = () => (
     <div className="flex flex-col items-center justify-center text-center text-destructive p-4 border border-destructive/50 rounded-md h-full">
        <AlertTriangle className="h-8 w-8 mb-2" />
        <p className="font-semibold">Error Loading News</p>
        <p className="text-sm">{error}</p>
    </div>
  );

  const renderEmptyState = () => (
     <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-4 border rounded-md h-full">
        <Newspaper className="h-8 w-8 mb-2" />
        <p className="font-semibold">No Recent News</p>
        <p className="text-sm">Could not find recent headlines for {symbol}.</p>
    </div>
  );

  const renderContent = () => {
     if (loading) return renderLoadingState();
     if (error) return renderErrorState(); // Show error state if API key missing or other errors occur
     if (!headlines || headlines.length === 0) return renderEmptyState();

     return (
        <ScrollArea className="h-[300px] w-full pr-4"> {/* Ensure ScrollArea has a defined height */}
            <div className="space-y-3">
            {headlines.map((headline, index) => (
                <div key={index} className="p-3 border rounded-md hover:bg-secondary/50 transition-colors">
                <a
                    href={headline.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary hover:underline block mb-1"
                     title={headline.title} // Add title attribute for full text hover
                >
                    {headline.title}
                     <ExternalLink className="inline-block h-3 w-3 ml-1 opacity-70" />
                </a>
                 <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span className="truncate max-w-[100px]" title={headline.source}>{headline.source}</span>
                    <span>{formatDistanceToNow(new Date(headline.publishedAt), { addSuffix: true })}</span>
                 </div>
                </div>
            ))}
            </div>
        </ScrollArea>
     );
  };

  return (
    <Card className="shadow-lg rounded-lg h-full flex flex-col"> {/* Ensure card takes full height */}
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-semibold text-primary">
          <Newspaper className="mr-2 h-5 w-5" /> Latest News for {symbol || 'N/A'}
        </CardTitle>
        <CardDescription>Recent headlines related to the selected stock.</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden"> {/* Allow content to grow and hide overflow */}
        {renderContent()}
      </CardContent>
       {/* Optional Footer */}
        <CardFooter className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">News provided by NewsAPI.org</p> {/* Updated source */}
        </CardFooter>
    </Card>
  );
}
