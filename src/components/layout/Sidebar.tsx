import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, ArrowUpDown, PlusCircle, TrendingUp, Tag,
  Wallet, CalendarDays, BarChart3, Target, Bot, Settings,
  Receipt, RefreshCw, Users2, Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
}

const navItems: NavItem[] = [
  { to: '/', icon: <LayoutDashboard className="h-5 w-5" />, label: 'Dashboard' },
  { to: '/transactions', icon: <ArrowUpDown className="h-5 w-5" />, label: 'Transactions' },
  { to: '/add-expense', icon: <PlusCircle className="h-5 w-5" />, label: 'Add Expense' },
  { to: '/income', icon: <TrendingUp className="h-5 w-5" />, label: 'Income' },
  { to: '/categories', icon: <Tag className="h-5 w-5" />, label: 'Categories' },
  { to: '/budgets', icon: <Wallet className="h-5 w-5" />, label: 'Budgets' },
  { to: '/events', icon: <CalendarDays className="h-5 w-5" />, label: 'Events' },
  { to: '/analytics', icon: <BarChart3 className="h-5 w-5" />, label: 'Analytics' },
  { to: '/goals', icon: <Target className="h-5 w-5" />, label: 'Goals' },
  { to: '/ai-assistant', icon: <Bot className="h-5 w-5" />, label: 'AI Assistant' },
  { to: '/receipts', icon: <Receipt className="h-5 w-5" />, label: 'Receipts' },
  { to: '/recurring', icon: <RefreshCw className="h-5 w-5" />, label: 'Recurring' },
  { to: '/splits', icon: <Users2 className="h-5 w-5" />, label: 'Splits' },
  { to: '/settings', icon: <Settings className="h-5 w-5" />, label: 'Settings' },
];

export function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 border-r bg-sidebar overflow-y-auto">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm">
          <Layers className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <span className="text-base font-bold text-sidebar-foreground">ExpenseTracker</span>
          <p className="text-xs text-muted-foreground leading-none mt-0.5">Personal Finance</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-sidebar-foreground hover:bg-muted hover:text-foreground'
              )
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t">
        <p className="text-xs text-muted-foreground text-center">v1.0.0 · All data local</p>
      </div>
    </aside>
  );
}
