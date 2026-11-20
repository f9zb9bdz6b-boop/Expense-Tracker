// ============================================================
// AnalyticsPage - Visual Spending Patterns, Comparisons & Highlights
// ============================================================
import React, { useState, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { db } from '@/db/database';
import { formatCurrency, DEFAULT_CURRENCY } from '@/utils/currency';
import { formatDate, getDateRange, formatRelativeDate } from '@/utils/date';
import { animateSpringPress } from '@/utils/motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InfoHint } from '@/components/ui/info-hint';
import {
  TrendingUp, TrendingDown, Calendar, PieChart as PieChartIcon,
  BarChart3, Sparkles, Award, Zap, ArrowUpRight, ArrowDownRight,
  Flame, ShieldCheck
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { format, subDays, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import type { Expense, ExpenseCategory } from '@/types';

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<'30days' | 'thisMonth' | 'all'>('30days');

  const allExpenses = useLiveQuery(() => db.expenses.orderBy('date').toArray()) ?? [];
  const categories = useLiveQuery(() => db.expenseCategories.toArray()) ?? [];
  const catMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

  // Filter expenses according to timeRange
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    if (timeRange === 'thisMonth') {
      const start = format(startOfMonth(now), 'yyyy-MM-dd');
      const end = format(endOfMonth(now), 'yyyy-MM-dd');
      return allExpenses.filter(e => e.date >= start && e.date <= end);
    }
    if (timeRange === '30days') {
      const start = format(subDays(now, 29), 'yyyy-MM-dd');
      return allExpenses.filter(e => e.date >= start);
    }
    return allExpenses;
  }, [allExpenses, timeRange]);

  const totalSpent = filteredExpenses.reduce((s, e) => s + e.amount, 0);

  // Daily Spending Trend Data
  const trendData = useMemo(() => {
    const dailyMap = new Map<string, number>();
    for (const e of filteredExpenses) {
      dailyMap.set(e.date, (dailyMap.get(e.date) ?? 0) + e.amount);
    }

    const dates = [...dailyMap.keys()].sort();
    return dates.map(d => ({
      date: d.slice(5), // MM-DD
      amount: dailyMap.get(d) ?? 0,
    }));
  }, [filteredExpenses]);

  // Category Breakdown Data
  const categoryData = useMemo(() => {
    const catTotals = new Map<string, number>();
    for (const e of filteredExpenses) {
      catTotals.set(e.categoryId, (catTotals.get(e.categoryId) ?? 0) + e.amount);
    }

    return [...catTotals.entries()]
      .map(([id, amount]) => {
        const cat = catMap.get(id);
        return {
          name: cat?.name || 'General',
          amount,
          color: cat?.color || '#3b82f6',
          percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses, catMap, totalSpent]);

  // Highlights & Statistics
  const highlights = useMemo(() => {
    if (filteredExpenses.length === 0) return null;

    // Largest expense
    const sortedByAmt = [...filteredExpenses].sort((a, b) => b.amount - a.amount);
    const largest = sortedByAmt[0];

    // Day spending map
    const dayMap = new Map<string, number>();
    for (const e of filteredExpenses) {
      dayMap.set(e.date, (dayMap.get(e.date) ?? 0) + e.amount);
    }
    const sortedDays = [...dayMap.entries()].sort((a, b) => b[1] - a[1]);
    const highestDay = sortedDays[0];

    // Average per active day
    const avgDaily = dayMap.size > 0 ? totalSpent / dayMap.size : 0;

    // Necessary vs Discretionary
    const needs = filteredExpenses.filter(e => e.classification === 'necessary').reduce((s, e) => s + e.amount, 0);
    const wants = filteredExpenses.filter(e => e.classification === 'discretionary').reduce((s, e) => s + e.amount, 0);

    return {
      largest,
      highestDay,
      avgDaily,
      needs,
      wants,
      activeDays: dayMap.size,
    };
  }, [filteredExpenses, totalSpent]);

  const pageRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.motion-header', { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.52, ease: 'power3.out', clearProps: 'all' });
      gsap.fromTo('.motion-controls', { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out', delay: 0.05, clearProps: 'all' });
      gsap.fromTo(
        '.motion-pulse-card',
        { y: 14, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.45, stagger: 0.05, ease: 'power3.out', delay: 0.08, clearProps: 'all' }
      );
      gsap.fromTo(
        '.motion-card',
        { y: 14, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.45, stagger: 0.05, ease: 'power3.out', delay: 0.1, clearProps: 'all' }
      );
    }, pageRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={pageRef} className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header & Controls */}
      <div className="motion-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Spending Analytics</h1>
          <InfoHint
            title="Spending Analytics"
            description="Understand trends, discretionary behavior, and opportunities to save across timeframes."
          />
        </div>
        <div className="motion-controls flex rounded-lg border bg-muted/40 p-1">
          <button
            onClick={() => setTimeRange('30days')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              timeRange === '30days' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setTimeRange('thisMonth')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              timeRange === 'thisMonth' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setTimeRange('all')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              timeRange === 'all' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Highlights Metric Cards */}
      {highlights && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="motion-pulse-card">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">Period Spending</span>
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <p className="text-2xl font-bold mt-1 text-foreground">{formatCurrency(totalSpent)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{filteredExpenses.length} transactions logged</p>
            </CardContent>
          </Card>

          <Card className="motion-pulse-card">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">Largest Single Expense</span>
                <Flame className="w-4 h-4 text-rose-500" />
              </div>
              <p className="text-2xl font-bold mt-1 text-rose-600 dark:text-rose-400">
                {formatCurrency(highlights.largest.amount)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{highlights.largest.description}</p>
            </CardContent>
          </Card>

          <Card className="motion-pulse-card">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">Peak Spending Day</span>
                <Calendar className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-bold mt-1 text-foreground">
                {formatCurrency(highlights.highestDay[1])}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{formatDate(highlights.highestDay[0])}</p>
            </CardContent>
          </Card>

          <Card className="motion-pulse-card">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">Discretionary Ratio</span>
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold mt-1 text-foreground">
                {totalSpent > 0 ? Math.round((highlights.wants / totalSpent) * 100) : 0}%
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatCurrency(highlights.wants)} on wants
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Charts: Spending Trend & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spending Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Daily Spending Trend
              <InfoHint text="Timeline of expenses across the selected timeframe" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trendData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                No expense data in this timeframe
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="spendColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#888888" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="#888888"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(val: number) => `${DEFAULT_CURRENCY.symbol}${Math.round(val / 100)}`}
                    />
                    <Tooltip formatter={(val: any) => [formatCurrency(Number(val) || 0), 'Spent']} />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke="#6366f1"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#spendColor)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Share Donut */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-primary" /> Category Breakdown
              <InfoHint text="Percentage distribution of total expenditures" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                No category data
              </div>
            ) : (
              <div className="space-y-4">
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="amount"
                      >
                        {categoryData.map((e, idx) => (
                          <Cell key={`cell-${idx}`} fill={e.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: any) => [formatCurrency(Number(val) || 0), 'Spent']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {categoryData.map(c => (
                    <div key={c.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                        <span className="font-medium text-foreground truncate max-w-[120px]">{c.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold">{formatCurrency(c.amount)}</span>
                        <span className="text-muted-foreground ml-1.5">({c.percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
