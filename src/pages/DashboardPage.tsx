// ============================================================
// DashboardPage - Human-first redesign (warm, editorial)
// ============================================================
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { useDashboard } from '@/hooks/useDashboard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatCurrency, formatCurrencyCompact } from '@/utils/currency';
import { formatDate } from '@/utils/date';
import { getCategoryEmoji } from '@/utils/emojis';
import {
  TrendingUp, TrendingDown, Wallet,
  ArrowUpRight, ArrowDownLeft,
  PlusCircle, Target, ArrowRight,
  PieChart as PieChartIcon,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, Tooltip,
} from 'recharts';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { summary, isLoading } = useDashboard();
  const [activePeriod, setActivePeriod] = useState<'month' | 'today' | 'all'>('month');

  const categoriesList = useLiveQuery(() => Promise.all([db.expenseCategories.toArray(), db.incomeCategories.toArray()])) ?? [[], []];
  const catEmojiMap = useMemo(() => {
    const map = new Map<string, string>();
    categoriesList[0]?.forEach(c => map.set(c.id, getCategoryEmoji(c)));
    categoriesList[1]?.forEach(c => map.set(c.id, getCategoryEmoji(c)));
    return map;
  }, [categoriesList]);

  if (isLoading || !summary) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-20 bg-muted rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="h-28 bg-muted rounded-lg" />
          <div className="h-28 bg-muted rounded-lg" />
          <div className="h-28 bg-muted rounded-lg" />
          <div className="h-28 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  const {
    totalIncome, totalExpenses, netBalance,
    currentMonthSpending, currentMonthIncome, todaySpending,
    necessaryExpenses, discretionaryExpenses,
    topCategories, recentTransactions, budgetProgress, goalProgress,
  } = summary;

  const displaySpending = activePeriod === 'today'
    ? todaySpending
    : activePeriod === 'month'
    ? currentMonthSpending
    : totalExpenses;
  const displayIncome = activePeriod === 'month' ? currentMonthIncome : totalIncome;

  const classificationData = [
    { name: 'Needs', value: necessaryExpenses, color: '#16a34a' },
    { name: 'Wants', value: discretionaryExpenses, color: '#d97706' },
  ].filter((d) => d.value > 0);

  // Today's date in readable form
  const today = new Date();
  const dateLabel = today.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-5">
      {/* Header: Date + Balance + Quick links */}
      <div className="pt-1">
        <p className="text-xs text-muted-foreground mb-0.5">{dateLabel}</p>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Net balance</p>
            <span className={`text-4xl font-semibold tracking-tight ${netBalance >= 0 ? 'text-foreground' : 'text-rose-600 dark:text-rose-400'}`}>
              {formatCurrency(netBalance)}
            </span>
          </div>
          <div className="flex items-center gap-2 pb-1">
            <Button size="sm" onClick={() => navigate('/add-expense')} className="gap-1.5 h-8 text-xs px-3">
              <PlusCircle className="w-3.5 h-3.5" /> Add expense
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate('/income')} className="gap-1.5 h-8 text-xs px-3">
              <ArrowDownLeft className="w-3.5 h-3.5" /> Log income
            </Button>
          </div>
        </div>
      </div>

      <hr className="border-border" />

      {/* Period toggle */}
      <div className="flex gap-1">
        {(['month', 'today', 'all'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setActivePeriod(p)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              activePeriod === p
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {p === 'month' ? 'This month' : p === 'today' ? 'Today' : 'All time'}
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Income */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Income</p>
            <div className="text-xl font-semibold text-foreground">
              {formatCurrency(displayIncome)}
            </div>
            {activePeriod !== 'month' && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Month: {formatCurrency(currentMonthIncome)}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Spent</p>
            <div className="text-xl font-semibold text-rose-600 dark:text-rose-400">
              {formatCurrency(displaySpending)}
            </div>
            {activePeriod !== 'today' && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Today: {formatCurrency(todaySpending)}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Net this month */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Month net</p>
            <div className={`text-xl font-semibold ${currentMonthIncome - currentMonthSpending >= 0 ? 'text-primary' : 'text-rose-600 dark:text-rose-400'}`}>
              {formatCurrency(currentMonthIncome - currentMonthSpending)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {currentMonthIncome - currentMonthSpending >= 0 ? 'Surplus' : 'Deficit'}
            </p>
          </CardContent>
        </Card>

        {/* Needs vs Wants */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Needs vs Wants</p>
            <div className="text-xl font-semibold text-foreground">
              {currentMonthSpending > 0
                ? `${Math.round((necessaryExpenses / currentMonthSpending) * 100)}%`
                : '—'}
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 mt-2 flex overflow-hidden">
              <div
                className="bg-primary h-full transition-all"
                style={{ width: `${currentMonthSpending > 0 ? (necessaryExpenses / currentMonthSpending) * 100 : 0}%` }}
              />
              <div
                className="bg-amber-500 h-full transition-all"
                style={{ width: `${currentMonthSpending > 0 ? (discretionaryExpenses / currentMonthSpending) * 100 : 0}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>Needs</span><span>Wants</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts + Budgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Top categories donut */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Top Spending Categories</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/analytics')} className="gap-1 text-xs h-7">
              Analytics <ArrowRight className="w-3 h-3" />
            </Button>
          </CardHeader>
          <CardContent>
            {topCategories.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center text-muted-foreground">
                <PieChartIcon className="w-10 h-10 stroke-[1.5] mb-2 opacity-30" />
                <p className="text-sm">No expenses this month.</p>
                <Button size="sm" variant="outline" onClick={() => navigate('/add-expense')} className="mt-3">
                  Add First Expense
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={topCategories}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="amount"
                      >
                        {topCategories.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.categoryColor} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(val: any) => [formatCurrency(Number(val) || 0), 'Spent']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2.5">
                  {topCategories.map((cat) => (
                    <div key={cat.categoryId} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-base shrink-0">
                          {catEmojiMap.get(cat.categoryId) || getCategoryEmoji(cat.categoryName)}
                        </span>
                        <span className="text-foreground truncate max-w-[130px] font-medium">{cat.categoryName}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(cat.amount)}</div>
                        <div className="text-[11px] text-muted-foreground">{cat.percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Budgets */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Budgets</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/budgets')} className="gap-1 text-xs h-7">
              Manage <ArrowRight className="w-3 h-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {budgetProgress.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-sm">No budgets set.</p>
                <Button size="sm" variant="outline" onClick={() => navigate('/budgets')} className="mt-2">
                  Create Budget
                </Button>
              </div>
            ) : (
              budgetProgress.map((b) => (
                <div key={b.budgetId} className="space-y-1.5">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-foreground">{b.budgetName}</span>
                    <span className={`text-xs font-medium ${b.status === 'exceeded' ? 'text-rose-600' : b.status === 'danger' ? 'text-orange-500' : 'text-muted-foreground'}`}>
                      {b.status === 'exceeded' ? 'Over limit' : `${Math.round(b.percentage)}%`}
                    </span>
                  </div>
                  <Progress value={Math.min(100, b.percentage)} className="h-1.5" />
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>{formatCurrency(b.spent)}</span>
                    <span>{formatCurrency(b.budgetAmount)}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions + Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Transactions */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Recent Transactions</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/transactions')} className="gap-1 text-xs h-7">
              View all <ArrowRight className="w-3 h-3" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <p className="text-sm">No transactions yet.</p>
                <Button size="sm" onClick={() => navigate('/add-expense')} className="mt-3">
                  Record Expense
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentTransactions.map((item) => {
                  const isExpense = 'classification' in item;
                  const emoji = catEmojiMap.get((item as any).categoryId) || (isExpense ? '💸' : '💰');
                  return (
                    <div
                      key={item.id}
                      className="py-2.5 flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-base shadow-xs"
                          style={{
                            backgroundColor: isExpense ? '#fee2e2' : '#dcfce7',
                          }}
                        >
                          <span>{emoji}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {item.description || (isExpense ? 'Expense' : 'Income')}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatDate(item.date)}
                            {isExpense && item.merchant && ` · ${item.merchant}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-semibold tabular-nums ${isExpense ? 'text-rose-600 dark:text-rose-400' : 'text-primary'}`}>
                          {isExpense ? '−' : '+'}{formatCurrency(item.amount)}
                        </p>
                        {isExpense && (
                          <p className="text-[10px] text-muted-foreground capitalize">{(item as any).classification}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Goals Snapshot */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Goals</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/goals')} className="gap-1 text-xs h-7">
              View all <ArrowRight className="w-3 h-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {goalProgress.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No savings goals yet.</p>
                <Button size="sm" variant="outline" onClick={() => navigate('/goals')} className="mt-2">
                  Set a Goal
                </Button>
              </div>
            ) : (
              goalProgress.map((g) => (
                <div key={g.goalId} className="space-y-1.5">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-foreground">{g.goalName}</span>
                    <span className="text-xs font-medium text-primary">{Math.round(g.percentage)}%</span>
                  </div>
                  <Progress value={Math.min(100, g.percentage)} className="h-1.5" />
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>{formatCurrency(g.currentAmount)}</span>
                    <span>{formatCurrency(g.targetAmount)}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
