import { TrendingUp } from 'lucide-react';
// Removed imports: Button, useAuth

export function Header() {
  // Removed useAuth hook call

  return (
    <header className="bg-primary text-primary-foreground shadow-md">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between"> {/* Use justify-between */}
        <div className="flex items-center"> {/* Group logo and title */}
            <TrendingUp className="h-8 w-8 mr-3" />
            <h1 className="text-2xl font-bold">UW FosterX</h1>
        </div>
        {/* Removed user display and logout button */}
      </div>
    </header>
  );
}
