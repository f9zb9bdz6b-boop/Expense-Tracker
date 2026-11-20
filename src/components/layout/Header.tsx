import React from 'react';
import { useLocation } from 'react-router-dom';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';

const routeTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/transactions': 'Transactions',
  '/add-expense': 'Add Expense',
  '/income': 'Income',
  '/categories': 'Categories',
  '/budgets': 'Budgets',
  '/events': 'Events',
  '/analytics': 'Analytics',
  '/goals': 'Goals',
  '/ai-assistant': 'AI Assistant',
  '/settings': 'Settings',
  '/receipts': 'Receipts',
  '/recurring': 'Recurring',
  '/splits': 'Splits',
};

export function Header() {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const title = routeTitles[location.pathname] ?? 'Expense Tracker';

  const cycleTheme = () => {
    const order = ['light', 'dark', 'system'] as const;
    const idx = order.indexOf(theme as typeof order[number]);
    setTheme(order[(idx + 1) % order.length]);
  };

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;

  // Format today's date in a human-readable way
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/80 bg-background/95 backdrop-blur-xs px-4 lg:px-6">
      {/* Page Title & Breadcrumb */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold tracking-tight text-foreground">{title}</h1>
        <span className="hidden sm:inline text-xs text-muted-foreground font-medium border-l border-border pl-3">
          {dateStr}
        </span>
      </div>

      {/* Right controls: Theme toggle & vault status */}
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60 border border-border/60 text-xs font-semibold text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Local Vault Synced</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={cycleTheme}
          aria-label={`Theme: ${theme}`}
          className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <ThemeIcon className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
