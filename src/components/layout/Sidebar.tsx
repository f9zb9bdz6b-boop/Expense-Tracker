import React, { useRef } from 'react';
import { NavLink } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import {
  LayoutDashboard, ArrowUpDown, PlusCircle, TrendingUp, Tag,
  Wallet, CalendarDays, BarChart3, Target,
  Settings, RefreshCw, Users2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { animateSpringPress, animateAvatarBounce } from '@/utils/motion';

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
];

export function Sidebar() {
  const sidebarRef = useRef<HTMLElement>(null);
  const { contextSafe } = useGSAP({ scope: sidebarRef });

  const handleLinkPress = contextSafe((e: React.MouseEvent<HTMLElement>) => {
    animateSpringPress(e.currentTarget);
  });

  const handleLogoHover = contextSafe((e: React.MouseEvent<HTMLElement>) => {
    animateAvatarBounce(e.currentTarget);
  });

  return (
    <aside ref={sidebarRef} className="hidden lg:flex flex-col w-56 shrink-0 h-screen sticky top-0 border-r bg-sidebar select-none shadow-xs">
      {/* Brand Header */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border">
        <div
          onMouseEnter={handleLogoHover}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold tracking-tight shadow-sm cursor-pointer select-none"
        >
          ET
        </div>
        <div>
          <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">Expense Tracker</span>
          <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Personal Finance</p>
        </div>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={handleLinkPress}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-all active:scale-95',
                      isActive
                        ? 'bg-primary/15 text-primary font-semibold shadow-xs'
                        : 'text-sidebar-foreground hover:bg-muted/70 hover:text-foreground'
                    )
                  }
                >
                  {item.icon}
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Settings pinned at the very bottom */}
      <div className="p-3 border-t border-border mt-auto">
        <NavLink
          to="/settings"
          onClick={handleLinkPress}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-all w-full active:scale-95',
              isActive
                ? 'bg-primary/15 text-primary font-semibold shadow-xs'
                : 'text-sidebar-foreground hover:bg-muted/70 hover:text-foreground'
            )
          }
        >
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </NavLink>
      </div>
    </aside>
  );
}
