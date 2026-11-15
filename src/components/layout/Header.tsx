import React from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-card/80 backdrop-blur-md px-4 lg:px-6">
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={cycleTheme}
          aria-label={`Theme: ${theme}`}
          className={cn('h-9 w-9')}
        >
          <ThemeIcon className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="h-9 w-9 relative">
          <Bell className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
