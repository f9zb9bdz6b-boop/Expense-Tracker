import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, ArrowUpDown, PlusCircle, TrendingUp, Tag,
  Wallet, CalendarDays, BarChart3, Target,
  Settings, RefreshCw, Users2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  end?: boolean;
}

const navGroups: { label?: string; items: NavItem[] }[] = [
  {
    items: [
      { to: '/', icon: <LayoutDashboard className="h-4 w-4" />, label: 'Dashboard', end: true },
      { to: '/transactions', icon: <ArrowUpDown className="h-4 w-4" />, label: 'Transactions' },
      { to: '/add-expense', icon: <PlusCircle className="h-4 w-4" />, label: 'Add Expense' },
    ],
  },
  {
    label: 'Money',
    items: [
      { to: '/income', icon: <TrendingUp className="h-4 w-4" />, label: 'Income' },
      { to: '/budgets', icon: <Wallet className="h-4 w-4" />, label: 'Budgets' },
      { to: '/goals', icon: <Target className="h-4 w-4" />, label: 'Goals' },
      { to: '/splits', icon: <Users2 className="h-4 w-4" />, label: 'Splits' },
    ],
  },
  {
    label: 'Manage',
    items: [
      { to: '/categories', icon: <Tag className="h-4 w-4" />, label: 'Categories' },
      { to: '/events', icon: <CalendarDays className="h-4 w-4" />, label: 'Events' },
      { to: '/recurring', icon: <RefreshCw className="h-4 w-4" />, label: 'Recurring' },
      { to: '/analytics', icon: <BarChart3 className="h-4 w-4" />, label: 'Analytics' },
    ],
  },
  {
    items: [
      { to: '/settings', icon: <Settings className="h-4 w-4" />, label: 'Settings' },
    ],
  },
];

export function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-56 shrink-0 h-screen sticky top-0 border-r bg-sidebar overflow-y-auto">
      {/* Wordmark */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b">
        <div className="flex h-7 w-7 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-bold tracking-tight select-none">
          ET
        </div>
        <span className="text-sm font-medium text-sidebar-foreground">Expense Tracker</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-4">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 px-2 py-1.5 rounded text-sm transition-colors',
                      isActive
                        ? 'border-l-2 border-primary pl-[6px] text-primary font-medium bg-primary/5'
                        : 'text-sidebar-foreground hover:bg-muted hover:text-foreground border-l-2 border-transparent pl-[6px]'
                    )
                  }
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-3 border-t">
        <p className="text-[11px] text-muted-foreground/50">All data stored locally</p>
      </div>
    </aside>
  );
}
