import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ArrowUpDown, Plus, BarChart3, Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { to: '/', icon: <LayoutDashboard className="h-5 w-5" />, label: 'Home', end: true },
  { to: '/transactions', icon: <ArrowUpDown className="h-5 w-5" />, label: 'Txns', end: false },
  { to: '/analytics', icon: <BarChart3 className="h-5 w-5" />, label: 'Analytics', end: false },
  { to: '/settings', icon: <Settings className="h-5 w-5" />, label: 'Settings', end: false },
];

export function MobileNav() {
  const navigate = useNavigate();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-card pb-safe">
      <div className="flex items-center justify-around px-2 pt-1 pb-2">
        {/* First 2 tabs */}
        {tabs.slice(0, 2).map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-w-[56px]',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            {tab.icon}
            <span>{tab.label}</span>
          </NavLink>
        ))}

        {/* Central Add button */}
        <button
          onClick={() => navigate('/add-expense')}
          className="flex flex-col items-center justify-center h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors -mt-6 ring-4 ring-background"
          aria-label="Add Expense"
        >
          <Plus className="h-6 w-6" />
        </button>

        {/* Last 2 tabs */}
        {tabs.slice(2).map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-w-[56px]',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            {tab.icon}
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
