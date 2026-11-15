// ============================================================
// DashboardPage - Comprehensive Home Dashboard with Real Data
// ============================================================
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '@/hooks/useDashboard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatCurrency, formatCurrencyCompact } from '@/utils/currency';
import { formatDate, formatRelativeDate } from '@/utils/date';
import {
  TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownLeft,
  PlusCircle, Target, AlertTriangle, ArrowRight, CheckCircle2,
  PieChart as PieChartIcon, Calendar, Zap, Sparkles
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, Tooltip
} from 'recharts';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { summary, isLoading } = useDashboard();
  const [activePeriod, setActivePeriod] = useState<'month' | 'today' | 'all'>('month');

  if (isLoading || !summary) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 bg-muted rounded-xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="h-32 bg-muted rounded-xl"></div>
          <div className="h-32 bg-muted rounded-xl"></div>
          <div className="h-32 bg-muted rounded-xl"></div>
          <div className="h-32 bg-muted rounded-xl"></div>
        </div>
      </div>
    );
  }

  const {
    totalIncome, totalExpenses, netBalance,
    currentMonthSpending, currentMonthIncome, todaySpending,
    necessaryExpenses, discretionaryExpenses,
    topCategories, recentTransactions, budgetProgress, goalProgress
  } = summary;

  const displaySpending = activePeriod === 'today' ? todaySpending : activePeriod === 'month' ? currentMonthSpending : totalExpenses;
  const displayIncome = activePeriod === 'month' ? currentMonthIncome : totalIncome;

  const classificationData = [
    { name: 'Necessary (Needs)', value: necessaryExpenses, color: '#3b82f6' },
    { name: 'Discretionary (Wants)', value: discretionaryExpenses, color: '#f59e0b' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 rounded-2xl border border-primary/20">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Welcome Back <Sparkles className="w-5 h-5 text-amber-500" />
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Here is your financial health overview and spending summary for this month.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button onClick={() => navigate('/add-expense')} className="gap-2 shadow-sm">
            <PlusCircle className="w-4 h-4" /> Add Expense
          </Button>
          <Button variant="outline" onClick={() => navigate('/income')} className="gap-2 bg-card">
            <ArrowDownLeft className="w-4 h-4 text-emerald-500" /> Add Income
          </Button>
          <Button variant="ghost" onClick={() => navigate('/ai-assistant')} className="gap-2 text-indigo-500 hover:text-indigo-600">
            <Zap className="w-4 h-4" /> Ask AI
          </Button>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total / Period Income */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Income</CardTitle>
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(displayIncome)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-emerald-500 font-medium">This month:</span> {formatCurrency(currentMonthIncome)}
            </p>
          </CardContent>
        </Card>

        {/* Total / Period Spending */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
            <div className="w-8 h-8 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {formatCurrency(displaySpending)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-rose-500 font-medium">Today:</span> {formatCurrency(todaySpending)}
            </p>
          </CardContent>
        </Card>

        {/* Net Balance */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Balance</CardTitle>
            <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {formatCurrency(netBalance)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {netBalance >= 0 ? 'Total Savings Surplus' : 'Net Deficit (Expenses > Income)'}
            </p>
          </CardContent>
        </Card>

        {/* Essential vs Discretionary Ratio */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Needs vs Wants</CardTitle>
            <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <PieChartIcon className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {currentMonthSpending > 0 ? `${Math.round((necessaryExpenses / currentMonthSpending) * 100)}% Needs` : '100% Needs'}
            </div>
            <div className="w-full bg-muted rounded-full h-2 mt-2 flex overflow-hidden">
              <div
                className="bg-blue-500 h-full"
                style={{ width: `${currentMonthSpending > 0 ? (necessaryExpenses / currentMonthSpending) * 100 : 50}%` }}
              />
              <div
                className="bg-amber-500 h-full"
                style={{ width: `${currentMonthSpending > 0 ? (discretionaryExpenses / currentMonthSpending) * 100 : 50}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span> Needs</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span> Wants</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Middle Section: Top Categories Chart & Budgets Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Spending Categories Donut */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Top Spending Categories</CardTitle>
              <p className="text-xs text-muted-foreground">Monthly expense distribution by category</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/analytics')} className="gap-1 text-xs">
              View Analytics <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {topCategories.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                <PieChartIcon className="w-12 h-12 stroke-[1.5] mb-2 opacity-40" />
                <p className="text-sm font-medium">No expenses recorded for this month</p>
                <p className="text-xs mt-1">Add an expense to view visual spending distribution</p>
                <Button size="sm" onClick={() => navigate('/add-expense')} className="mt-4">
                  Add First Expense
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={topCategories}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
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
                <div className="space-y-3">
                  {topCategories.map(cat => (
                    <div key={cat.categoryId} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2.5">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.categoryColor }} />
                        <span className="font-medium text-foreground truncate max-w-[140px]">{cat.categoryName}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(cat.amount)}</div>
                        <div className="text-xs text-muted-foreground">{cat.percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Budgets Tracker Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Active Budgets</CardTitle>
              <p className="text-xs text-muted-foreground">Monthly spending limits</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/budgets')} className="gap-1 text-xs">
              Manage <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {budgetProgress.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">No budgets defined yet</p>
                <p className="text-xs mt-1">Set monthly limits to keep spending on track</p>
                <Button size="sm" variant="outline" onClick={() => navigate('/budgets')} className="mt-3">
                  Create Budget
                </Button>
              </div>
            ) : (
              budgetProgress.map(b => (
                <div key={b.budgetId} className="space-y-1.5 p-3 rounded-lg border bg-card/50">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">{b.budgetName}</span>
                    <Badge
                      variant={b.status === 'exceeded' ? 'destructive' : b.status === 'danger' ? 'destructive' : b.status === 'warning' ? 'secondary' : 'default'}
                      className="text-[10px] px-2 py-0.5"
                    >
                      {b.status === 'exceeded' ? 'Exceeded' : `${Math.round(b.percentage)}%`}
                    </Badge>
                  </div>
                  <Progress value={Math.min(100, b.percentage)} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground pt-0.5">
                    <span>{formatCurrency(b.spent)}</span>
                    <span>Limit: {formatCurrency(b.budgetAmount)}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section: Recent Transactions & Financial Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
              <p className="text-xs text-muted-foreground">Latest financial activities</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/transactions')} className="gap-1 text-xs">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                <p className="text-sm">No transactions found.</p>
                <Button size="sm" onClick={() => navigate('/add-expense')} className="mt-3">
                  Record Expense
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {recentTransactions.map(item => {
                  const isExpense = 'classification' in item;
                  return (
                    <div key={item.id} className="py-3 flex items-center justify-between hover:bg-muted/30 px-2 rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isExpense ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                          {isExpense ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{item.description || (isExpense ? 'Expense' : 'Income')}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <span>{formatDate(item.date)}</span>
                            {isExpense && item.merchant && <span>• {item.merchant}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${isExpense ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {isExpense ? '-' : '+'}{formatCurrency(item.amount)}
                        </p>
                        {isExpense && (
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {item.classification}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Goals Snapshot */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Financial Goals</CardTitle>
              <p className="text-xs text-muted-foreground">Savings & targets</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/goals')} className="gap-1 text-xs">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {goalProgress.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">No savings goals yet</p>
                <p className="text-xs mt-1">Plan for vacations, emergency fund, or gadgets</p>
                <Button size="sm" variant="outline" onClick={() => navigate('/goals')} className="mt-3">
                  Set a Goal
                </Button>
              </div>
            ) : (
              goalProgress.map(g => (
                <div key={g.goalId} className="p-3 rounded-lg border bg-card/50 space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-foreground">{g.goalName}</span>
                    <span className="text-xs font-semibold text-primary">{Math.round(g.percentage)}%</span>
                  </div>
                  <Progress value={Math.min(100, g.percentage)} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Saved: {formatCurrency(g.currentAmount)}</span>
                    <span>Target: {formatCurrency(g.targetAmount)}</span>
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
