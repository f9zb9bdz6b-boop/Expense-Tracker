// ============================================================
// DashboardPage - Executive Financial Hub with GSAP Motion Design
// Redesigned with Apple Wallet / Revolut Ultra aesthetic & 10+ Motion Elements
// ============================================================
import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { db } from '@/db/database';
import { useDashboard } from '@/hooks/useDashboard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatCurrency, formatCurrencyCompact } from '@/utils/currency';
import { formatDate } from '@/utils/date';
import { getCategoryEmoji, getPaymentMethodEmoji } from '@/utils/emojis';
import { InfoHint } from '@/components/ui/info-hint';
import {
  TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownLeft,
  PlusCircle, Target, ArrowRight, Sparkles, ShieldCheck,
  Calendar, Layers, Clock, Activity, Zap, CheckCircle2, ChevronRight
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
} from 'recharts';

gsap.registerPlugin(useGSAP);

export default function DashboardPage() {
  const navigate = useNavigate();
  const dashboardRef = useRef<HTMLDivElement>(null);
  const balanceValRef = useRef<HTMLSpanElement>(null);
  const balanceTween = useRef({ val: 0 });

  const { summary, isLoading } = useDashboard();
  const [activePeriod, setActivePeriod] = useState<'month' | 'today' | 'all'>('month');

  // Categories query for live reactive emojis
  const categoriesList = useLiveQuery(() => Promise.all([
    db.expenseCategories.toArray(),
    db.incomeCategories.toArray()
  ])) ?? [[], []];

  const catEmojiMap = useMemo(() => {
    const map = new Map<string, string>();
    categoriesList[0]?.forEach(c => map.set(c.id, getCategoryEmoji(c)));
    categoriesList[1]?.forEach(c => map.set(c.id, getCategoryEmoji(c)));
    return map;
  }, [categoriesList]);

  // Context-safe interactive button bounce & card hover animations
  const { contextSafe } = useGSAP({ scope: dashboardRef });

  // MOTION ELEMENT 4: Interactive Button Spring Press
  const handleButtonPress = contextSafe((e: React.MouseEvent<HTMLElement>) => {
    gsap.timeline()
      .to(e.currentTarget, { scale: 0.94, duration: 0.08, ease: 'power2.in' })
      .to(e.currentTarget, { scale: 1, duration: 0.22, ease: 'back.out(2.5)' });
  });

  // MOTION ELEMENT 10: Interactive Card Hover Lift
  const handleCardMouseEnter = contextSafe((e: React.MouseEvent<HTMLElement>) => {
    gsap.to(e.currentTarget, {
      y: -4,
      boxShadow: '0 14px 28px -10px rgba(15, 23, 42, 0.08), 0 4px 8px -4px rgba(15, 23, 42, 0.04)',
      duration: 0.28,
      ease: 'power2.out',
    });
  });

  const handleCardMouseLeave = contextSafe((e: React.MouseEvent<HTMLElement>) => {
    gsap.to(e.currentTarget, {
      y: 0,
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      duration: 0.28,
      ease: 'power2.out',
    });
  });

  // Data computations
  const totalIncome = summary?.totalIncome ?? 0;
  const totalExpenses = summary?.totalExpenses ?? 0;
  const netBalance = summary?.netBalance ?? 0;
  const currentMonthSpending = summary?.currentMonthSpending ?? 0;
  const currentMonthIncome = summary?.currentMonthIncome ?? 0;
  const todaySpending = summary?.todaySpending ?? 0;
  const necessaryExpenses = summary?.necessaryExpenses ?? 0;
  const discretionaryExpenses = summary?.discretionaryExpenses ?? 0;
  const topCategories = summary?.topCategories ?? [];
  const recentTransactions = summary?.recentTransactions ?? [];
  const budgetProgress = summary?.budgetProgress ?? [];
  const goalProgress = summary?.goalProgress ?? [];

  const totalClassified = necessaryExpenses + discretionaryExpenses;
  const hasClassified = totalClassified > 0;
  const needsPercent = hasClassified ? Math.round((necessaryExpenses / totalClassified) * 100) : 65;
  const wantsPercent = hasClassified ? (100 - needsPercent) : 35;

  const displaySpending = activePeriod === 'today'
    ? todaySpending
    : activePeriod === 'month'
    ? currentMonthSpending
    : totalExpenses;

  const displayIncome = activePeriod === 'month' ? currentMonthIncome : totalIncome;

  const savingsRate = displayIncome > 0
    ? Math.max(0, Math.round(((displayIncome - displaySpending) / displayIncome) * 100))
    : 0;

  // Today's formatted date
  const todayDateStr = useMemo(() => {
    return new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  // ============================================================
  // GSAP ENTRANCE & SNAP TRANSITIONS (Cinematic, Smooth, Zero-Lag)
  // ============================================================
  useGSAP(() => {
    if (isLoading || !summary) return;

    const ctx = gsap.context(() => {
      // 1. Hero Card Entrance (Smooth cinematic rise)
      gsap.fromTo('.hero-mesh-card',
        { y: 28, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.85, ease: 'power3.out', clearProps: 'all' }
      );

      // 2. Staggered Entrance of 4 KPI Metric Cards
      gsap.fromTo('.kpi-stat-card',
        { y: 26, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.82, stagger: 0.08, ease: 'power3.out', delay: 0.08, clearProps: 'all' }
      );

      // 4. Category Spending Staggered Rows Entrance
      gsap.fromTo('.category-row-item',
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.72, stagger: 0.04, ease: 'power2.out', delay: 0.16, clearProps: 'all' }
      );

      // 5. Dynamic Progress Bars Fill Expansion
      gsap.fromTo('.animated-meter-bar',
        { scaleX: 0, transformOrigin: 'left' },
        { scaleX: 1, duration: 0.95, stagger: 0.06, ease: 'power2.out', delay: 0.22, clearProps: 'transformOrigin' }
      );

      // 6. Recent Activity Transaction Ledger Cascade
      gsap.fromTo('.recent-tx-row',
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.72, stagger: 0.04, ease: 'power2.out', delay: 0.16, clearProps: 'all' }
      );

      // 7. Budget & Goals Card Slide-In
      gsap.fromTo('.widget-card',
        { y: 26, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.82, stagger: 0.08, ease: 'power3.out', delay: 0.18, clearProps: 'all' }
      );
    }, dashboardRef);

    return () => ctx.revert();
  }, [isLoading]);

  // Handle period change transition
  useGSAP(() => {
    if (!summary) return;
    gsap.fromTo('.kpi-stat-card', 
      { opacity: 0.6, y: 6 },
      { opacity: 1, y: 0, duration: 0.35, stagger: 0.05, ease: 'power2.out' }
    );
  }, { dependencies: [activePeriod], scope: dashboardRef });

  if (isLoading || !summary) {
    return (
      <div className="space-y-6 animate-pulse p-1">
        <div className="h-56 bg-slate-200/80 dark:bg-slate-800 rounded-3xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-32 bg-slate-200/70 dark:bg-slate-800 rounded-2xl" />
          <div className="h-32 bg-slate-200/70 dark:bg-slate-800 rounded-2xl" />
          <div className="h-32 bg-slate-200/70 dark:bg-slate-800 rounded-2xl" />
          <div className="h-32 bg-slate-200/70 dark:bg-slate-800 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-80 bg-slate-200/70 dark:bg-slate-800 rounded-2xl lg:col-span-2" />
          <div className="h-80 bg-slate-200/70 dark:bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div ref={dashboardRef} className="space-y-6 pb-12">
      {/* ============================================================
          TOP HERO CARD: Coinest Deep Forest with Vibrant Lime Highlights
          ============================================================ */}
      <div className="hero-mesh-card relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#10241a] via-[#143322] to-[#0c1d14] text-white p-6 sm:p-7 shadow-sm border border-[#1b3d2b]">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Left Column: Date, Health Badge, Net Balance Ticker */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold text-[#7cf046] tracking-wider uppercase">
                {todayDateStr}
              </span>
              <span className="w-1 h-1 rounded-full bg-white/40" />
              {/* Health Pulse Pill */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-[#7cf046] text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7cf046] animate-pulse" />
                <span>{netBalance >= 0 ? 'Healthy Cash Flow' : 'Deficit Alert'}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-medium text-white/70 uppercase tracking-wider">
                  Total Net Balance
                </p>
                <InfoHint
                  text="100% Private local vault with zero cloud tracking. Stored securely in your browser's Dexie database."
                  className="text-white/60"
                />
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                {/* Live Animated Number Ticker (Motion Element 1) */}
                <span
                  ref={balanceValRef}
                  className="text-4xl sm:text-5xl font-extrabold tracking-tight tabular-nums text-white"
                >
                  {formatCurrency(netBalance)}
                </span>
                <span className="text-xs text-[#7cf046] font-extrabold bg-[#7cf046]/15 border border-[#7cf046]/30 px-2 py-0.5 rounded-md">
                  INR
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Quick Action Buttons */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
            <button
              onClick={e => {
                handleButtonPress(e);
                navigate('/add-expense');
              }}
              className="hero-action-btn flex items-center justify-center gap-2 bg-[#7cf046] hover:bg-[#6ee33a] text-[#082b14] font-extrabold px-5 py-2.5 rounded-xl shadow-xs transition-transform active:scale-95 text-sm cursor-pointer select-none"
            >
              <PlusCircle className="w-4 h-4" /> Add Expense
            </button>
            <button
              onClick={e => {
                handleButtonPress(e);
                navigate('/income');
              }}
              className="hero-action-btn flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white border border-white/20 font-semibold px-4 py-2.5 rounded-xl transition-transform active:scale-95 text-sm cursor-pointer select-none"
            >
              <ArrowDownLeft className="w-4 h-4 text-[#7cf046]" /> Log Income
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================
          PERIOD GLIDING CONTROLLER
          ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <h2 className="text-base font-bold text-foreground tracking-tight">Financial Pulse</h2>
          <InfoHint text="Real-time cash flow, savings velocity, and 50/30/20 needs vs wants split." />
        </div>

        {/* Gliding Period Toggle Pills */}
        <div className="flex rounded-xl border border-border/80 bg-card p-1 shadow-xs">
          {(['month', 'today', 'all'] as const).map(p => (
            <button
              key={p}
              onClick={() => setActivePeriod(p)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activePeriod === p
                  ? 'bg-foreground text-background shadow-xs scale-100 font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {p === 'month' ? 'This Month' : p === 'today' ? 'Today' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* ============================================================
          KPI METRIC CARDS GRID (Coinest Clean White with Vibrant Pill Badges)
          ============================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Inflow */}
        <div className="kpi-stat-card bg-card border border-border/80 rounded-2xl p-5 shadow-xs hover:border-border transition-[box-shadow,border-color] duration-200 cursor-default">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Cash Inflow
            </span>
            <span className="inline-flex items-center gap-1 bg-[#7cf046]/20 text-[#0e5c27] border border-[#7cf046]/40 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full">
              ↑ Inflow
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
              +{formatCurrency(displayIncome)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-emerald-600 font-semibold">● Active</span>
              <span>· {activePeriod === 'month' ? 'Current Month' : activePeriod === 'today' ? 'Today' : 'All Time'}</span>
            </p>
          </div>
        </div>

        {/* Card 2: Outflow */}
        <div className="kpi-stat-card bg-card border border-border/80 rounded-2xl p-5 shadow-xs hover:border-border transition-[box-shadow,border-color] duration-200 cursor-default">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Outflow
            </span>
            <span className="inline-flex items-center gap-1 bg-[#fee2e2] text-[#b91c1c] border border-rose-200 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full">
              ↓ Outflow
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 tabular-nums">
              -{formatCurrency(displaySpending)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {activePeriod !== 'today' ? (
                <>Today: <span className="privacy-blur tabular-nums">{formatCurrency(todaySpending)}</span></>
              ) : (
                <>Month: <span className="privacy-blur tabular-nums">{formatCurrency(currentMonthSpending)}</span></>
              )}
            </p>
          </div>
        </div>

        {/* Card 3: Net Savings Velocity */}
        <div className="kpi-stat-card bg-card border border-border/80 rounded-2xl p-5 shadow-xs hover:border-border transition-[box-shadow,border-color] duration-200 cursor-default">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Savings Velocity
            </span>
            <span className="inline-flex items-center gap-1 bg-[#7cf046]/20 text-[#0e5c27] border border-[#7cf046]/40 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full">
              ↑ Savings
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {savingsRate}%
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {displayIncome - displaySpending >= 0 ? (
                <span className="text-emerald-600 font-semibold">Surplus +<span className="privacy-blur tabular-nums">{formatCurrency(displayIncome - displaySpending)}</span></span>
              ) : (
                <span className="text-rose-600 font-semibold">Deficit <span className="privacy-blur tabular-nums">{formatCurrency(displayIncome - displaySpending)}</span></span>
              )}
            </p>
          </div>
        </div>

        {/* Card 4: Needs vs Wants Equilibrium */}
        <div className="kpi-stat-card bg-card border border-border/80 rounded-2xl p-5 shadow-xs hover:border-border transition-[box-shadow,border-color] duration-200 cursor-default">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Needs vs Wants
            </span>
            <span className="inline-flex items-center gap-1 bg-[#7cf046]/20 text-[#0e5c27] border border-[#7cf046]/40 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full">
              ⚖️ Balance
            </span>
          </div>
          <div className="mt-2.5">
            <div className="flex justify-between items-baseline">
              <span className="text-lg font-bold text-foreground">
                {hasClassified ? `${needsPercent}% Needs` : 'Balanced 65/35'}
              </span>
              <span className="text-xs text-muted-foreground font-semibold">
                {hasClassified ? `${wantsPercent}% Wants` : ''}
              </span>
            </div>
            {/* Split Progress Meter Bar */}
            <div className="w-full bg-[#edf4ed] dark:bg-slate-800 rounded-full h-3 mt-2 flex overflow-hidden border border-[#dce8dc] dark:border-slate-700/80 p-0.5">
              <div
                className="h-full bg-emerald-500 rounded-l-full transition-all duration-500"
                style={{ width: `${needsPercent}%` }}
                title={`Needs: ${needsPercent}%`}
              />
              <div
                className="h-full bg-amber-500 rounded-r-full transition-all duration-500"
                style={{ width: `${wantsPercent}%` }}
                title={`Wants: ${wantsPercent}%`}
              />
            </div>
            <div className="flex justify-between text-[11px] font-medium text-muted-foreground mt-1.5">
              <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> 🌿 <span className="privacy-blur tabular-nums">{formatCurrency(necessaryExpenses || (displaySpending ? displaySpending * 0.65 : 0))}</span>
              </span>
              <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> ✨ <span className="privacy-blur tabular-nums">{formatCurrency(discretionaryExpenses || (displaySpending ? displaySpending * 0.35 : 0))}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          MAIN BODY: Top Categories + Active Budgets
          ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Spending Categories */}
        <Card className="widget-card lg:col-span-2 rounded-2xl border-border/80 shadow-xs hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <span>🥧</span> Top Spending Categories
              <InfoHint text="Breakdown of your highest spending categories this billing cycle." />
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/categories')}
              className="text-xs gap-1 h-8 rounded-xl"
            >
              View all <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </CardHeader>

          <CardContent>
            {topCategories.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <p className="text-sm font-medium">No expenses logged this period</p>
                <Button
                  size="sm"
                  onClick={() => navigate('/add-expense')}
                  className="mt-3 text-xs rounded-xl"
                >
                  Record first expense
                </Button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {topCategories.map(cat => {
                  const emoji = catEmojiMap.get(cat.categoryId) || getCategoryEmoji(cat.categoryName);
                  return (
                    <div
                      key={cat.categoryId}
                      className="category-row-item p-2.5 rounded-xl hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-base shadow-xs">
                            {emoji}
                          </span>
                          <span className="font-semibold text-foreground">{cat.categoryName}</span>
                          <span className="text-[11px] text-muted-foreground">
                            · {cat.transactionCount} {cat.transactionCount === 1 ? 'txn' : 'txns'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-foreground tabular-nums privacy-blur">
                            {formatCurrency(cat.amount)}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2 font-medium">
                            <span className="privacy-blur tabular-nums">{cat.percentage.toFixed(1)}%</span>
                          </span>
                        </div>
                      </div>

                      {/* Animated Category Progress Fill Bar */}
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="animated-meter-bar h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, Math.max(3, cat.percentage))}%`,
                            backgroundColor: cat.categoryColor || '#059669',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Budgets & Spending Runway (Motion Element 10) */}
        <Card className="widget-card rounded-2xl border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <span>🎯</span> Active Budgets
              <InfoHint text="Monthly budget envelopes and spending limits to keep you on track." />
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/budgets')}
              className="text-xs gap-1 h-8 rounded-xl"
            >
              Manage <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </CardHeader>

          <CardContent className="space-y-4">
            {budgetProgress.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm font-medium">No budgets created yet</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/budgets')}
                  className="mt-3 text-xs rounded-xl"
                >
                  Create Budget
                </Button>
              </div>
            ) : (
              budgetProgress.slice(0, 4).map(b => (
                <div key={b.budgetId} className="space-y-1.5 p-2 rounded-xl hover:bg-muted/20 transition-colors">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-foreground truncate max-w-[150px]">{b.budgetName}</span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                        b.status === 'exceeded'
                          ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10'
                          : b.status === 'danger'
                          ? 'bg-orange-50 text-orange-600 dark:bg-orange-500/10'
                          : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10'
                      }`}
                    >
                      {b.status === 'exceeded' ? 'Over Budget' : `${Math.round(b.percentage)}%`}
                    </span>
                  </div>
                  <Progress value={Math.min(100, b.percentage)} className="h-2 rounded-full" />
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span><span className="privacy-blur tabular-nums">{formatCurrency(b.spent)}</span></span>
                    <span>Cap: <span className="privacy-blur tabular-nums">{formatCurrency(b.budgetAmount)}</span></span>
                  </div>
                </div>
              ))
            )}

            {/* Quick Goals Snapshot */}
            {goalProgress.length > 0 && (
              <div className="pt-3 border-t border-border/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Savings Targets
                  </span>
                  <button
                    onClick={() => navigate('/goals')}
                    className="text-xs text-primary font-semibold hover:underline"
                  >
                    View Goals
                  </button>
                </div>
                {goalProgress.slice(0, 2).map(g => (
                  <div key={g.goalId} className="space-y-1 py-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-foreground">{g.goalName}</span>
                      <span className="font-bold text-emerald-600">{Math.round(g.percentage)}%</span>
                    </div>
                    <Progress value={Math.min(100, g.percentage)} className="h-1.5 rounded-full" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ============================================================
          BOTTOM SECTION: Recent Activity Ledger (Motion Element 8)
          ============================================================ */}
      <Card className="widget-card rounded-2xl border-border/80 shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <span>⚡</span> Recent Ledger Activity
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Latest transactions synced to local IndexedDB.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/transactions')}
            className="text-xs gap-1 h-8 rounded-xl font-semibold"
          >
            Full Ledger <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </CardHeader>

        <CardContent>
          {recentTransactions.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <p className="text-sm font-medium">No recorded transactions</p>
              <Button
                size="sm"
                onClick={() => navigate('/add-expense')}
                className="mt-3 text-xs rounded-xl"
              >
                Log an Expense
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {recentTransactions.slice(0, 6).map(item => {
                const isExpense = 'classification' in item;
                const emoji = catEmojiMap.get((item as any).categoryId) || (isExpense ? '💸' : '💰');
                const pmName = isExpense && 'paymentMethodId' in item ? (item as any).paymentMethodId : (item as any).paymentMethod;
                const pmEmoji = getPaymentMethodEmoji(pmName || (isExpense ? 'Cash' : 'Bank Transfer'));

                return (
                  <div
                    key={item.id}
                    className="recent-tx-row py-3 flex items-center justify-between gap-3 hover:bg-muted/30 px-2 rounded-xl transition-colors group cursor-default"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Squircle Emoji Avatar */}
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 text-lg shadow-xs transition-transform group-hover:scale-105"
                        style={{
                          backgroundColor: isExpense ? '#fee2e2' : '#dcfce7',
                        }}
                      >
                        <span>{emoji}</span>
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {item.description || (isExpense ? 'Expense' : 'Income')}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                          <span>{formatDate(item.date)}</span>
                          <span className="inline-flex items-center gap-1 bg-muted/60 px-1.5 py-0.2 rounded text-[10px] font-medium text-foreground">
                            <span>{pmEmoji}</span>
                          </span>
                          {isExpense && item.merchant && (
                            <span className="truncate">· {item.merchant}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p
                        className={`text-sm font-bold tabular-nums tracking-tight ${
                          isExpense ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {isExpense ? '-' : '+'}{formatCurrency(item.amount)}
                      </p>
                      {isExpense && (item as any).classification && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {(item as any).classification === 'necessary' ? '🌿 Need' : '✨ Want'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
