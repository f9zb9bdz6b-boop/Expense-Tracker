import React, { useRef } from 'react';
import { NavLink } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import {
  LayoutDashboard, ArrowUpDown, PlusCircle, TrendingUp, Tag,
  Wallet, CalendarDays, BarChart3, Target,
  Settings, RefreshCw, Users2, Landmark, Flame, Wrench, Sparkles
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
  {
    label: 'Wealth & Insights',
    items: [
      { to: '/wealth', icon: <Landmark className="h-4 w-4" />, label: 'Wealth & FIRE' },
      { to: '/habits', icon: <Flame className="h-4 w-4" />, label: 'Habits & Scores' },
      { to: '/tools', icon: <Wrench className="h-4 w-4" />, label: 'Tools & Import' },
      { to: '/ai-assistant', icon: <Sparkles className="h-4 w-4" />, label: 'AI Predictor' },
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
    <aside ref={sidebarRef} className="hidden lg:flex flex-col w-60 shrink-0 h-screen sticky top-0 border-r bg-sidebar select-none shadow-xs">
      {/* Coinest Brand Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border/80">
        <div
          onMouseEnter={handleLogoHover}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground text-xs font-bold tracking-tight shadow-xs cursor-pointer select-none"
        >
          <div className="grid grid-cols-2 gap-0.5">
            <span className="w-1.5 h-1.5 rounded-xs bg-[#7cf046]" />
            <span className="w-1.5 h-1.5 rounded-xs bg-white" />
            <span className="w-1.5 h-1.5 rounded-xs bg-white" />
            <span className="w-1.5 h-1.5 rounded-xs bg-[#7cf046]" />
          </div>
        </div>
        <div>
          <span className="text-base font-extrabold tracking-tight text-foreground uppercase">Expense Tracker</span>
          <p className="text-[10px] text-muted-foreground leading-none font-medium mt-0.5">Personal Finance</p>
        </div>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 px-4 py-4 space-y-4 overflow-y-auto">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="px-2.5 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={handleLinkPress}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95',
                      isActive
                        ? 'bg-[#7cf046] dark:bg-emerald-500/25 text-[#082b14] dark:text-emerald-300 font-bold shadow-xs'
                        : 'text-sidebar-foreground hover:bg-[#dfeadf] dark:hover:bg-muted/40 hover:text-foreground'
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

      {/* Bottom Vault Card (Coinest Dark Card Style) */}
      <div className="px-3 py-2">
        <div className="bg-[#10241a] dark:bg-[#152e20] text-white p-3.5 rounded-2xl space-y-1.5 border border-white/10 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>🛡️</span> Local Vault
            </span>
            <span className="text-[9px] bg-[#7cf046] text-[#082b14] font-extrabold px-1.5 py-0.5 rounded-full">
              SECURE
            </span>
          </div>
          <p className="text-[10px] text-white/70 leading-snug">
            100% private on-device ledger.
          </p>
        </div>
      </div>

      {/* Settings pinned at the very bottom */}
      <div className="p-3 border-t border-border mt-auto">
        <NavLink
          to="/settings"
          onClick={handleLinkPress}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all w-full active:scale-95',
              isActive
                ? 'bg-[#7cf046] dark:bg-emerald-500/25 text-[#082b14] dark:text-emerald-300 font-bold shadow-xs'
                : 'text-sidebar-foreground hover:bg-[#dfeadf] dark:hover:bg-muted/40 hover:text-foreground'
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
