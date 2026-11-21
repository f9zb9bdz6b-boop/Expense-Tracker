import React from 'react';
import { useLocation } from 'react-router-dom';
import { Moon, Sun, Monitor, Eye, EyeOff } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useSettings } from '@/contexts/SettingsContext';
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
  '/wealth': 'Wealth & FIRE',
  '/habits': 'Habits & Challenges',
  '/tools': 'Automation & Imports',
  '/ai-assistant': 'Predictive AI',
  '/settings': 'Settings',
  '/receipts': 'Receipts',
  '/recurring': 'Recurring',
  '/splits': 'Splits',
};

export function Header() {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { coffeeShopMode, toggleCoffeeShopMode } = useSettings();
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

      {/* Right controls: Privacy Mode, Theme toggle & vault status */}
      <div className="flex items-center gap-2">
        {/* Coffee Shop Privacy Mode Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={toggleCoffeeShopMode}
          title={coffeeShopMode ? 'Privacy Mode Active (Amounts Blurred)' : 'Enable Coffee Shop Privacy Mode'}
          className={`h-8 gap-1.5 rounded-xl px-2.5 text-xs font-bold cursor-pointer select-none transition-all ${
            coffeeShopMode
              ? 'bg-[#7cf046] text-[#082b14] border-[#7cf046] hover:bg-[#6ee33a] shadow-xs'
              : 'bg-white dark:bg-card text-foreground border-border/80 hover:bg-slate-50 dark:hover:bg-muted/60 shadow-2xs'
          }`}
        >
          {coffeeShopMode ? <EyeOff className="h-3.5 w-3.5 text-[#082b14]" /> : <Eye className="h-3.5 w-3.5 text-emerald-600" />}
          <span className="inline">{coffeeShopMode ? 'Privacy On' : 'Privacy Mode'}</span>
        </Button>

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
