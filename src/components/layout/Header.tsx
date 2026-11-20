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
    <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b bg-background/90 backdrop-blur-sm px-4 lg:px-6">
      {/* On mobile show title; on desktop show today's date */}
      <span className="text-sm text-muted-foreground">
        <span className="lg:hidden font-medium text-foreground">{title}</span>
        <span className="hidden lg:inline">{dateStr}</span>
      </span>
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={cycleTheme}
          aria-label={`Theme: ${theme}`}
          className="h-8 w-8"
        >
          <ThemeIcon className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
