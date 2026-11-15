// ============================================================
// useAnalytics Hook - Analytics calculations from real data
// ============================================================
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { format, parseISO, startOfWeek, getDay, eachDayOfInterval } from 'date-fns';
import type {
  CategorySpending, SpendingByPeriod, SpendingHighlights,
  SpendingComparison, Expense,
} from '@/types';
import type { DateRange } from '@/utils/date';
import {
  getDaysInRange, getWeeksInRange, getMonthsInRange,
  getPreviousDateRange, isDateInRange,
} from '@/utils/date';

export function useAnalytics() {
  const allExpenses = useLiveQuery(() =>
    db.expenses.orderBy('date').reverse().toArray()
  ) ?? [];

  const allIncome = useLiveQuery(() =>
    db.income.orderBy('date').reverse().toArray()
  ) ?? [];

  const allCategories = useLiveQuery(() =>
    db.expenseCategories.orderBy('order').toArray()
  ) ?? [];

  const allPaymentMethods = useLiveQuery(() =>
    db.paymentMethods.orderBy('order').toArray()
  ) ?? [];

  const allBudgets = useLiveQuery(() =>
    db.budgets.where('isActive').equals(1).toArray()
  ) ?? [];

  const catMap = new Map(allCategories.map(c => [c.id, c]));
  const pmMap = new Map(allPaymentMethods.map(pm => [pm.id, pm]));

  function filterExpenses(dateRange: DateRange): Expense[] {
    return allExpenses.filter(e =>
      e.date >= dateRange.from && e.date <= dateRange.to
    );
  }

  function getSpendingByCategory(dateRange: DateRange): CategorySpending[] {
    const expenses = filterExpenses(dateRange);
    const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);

    const categoryTotals = new Map<string, { amount: number; count: number }>();
    for (const e of expenses) {
      const existing = categoryTotals.get(e.categoryId) ?? { amount: 0, count: 0 };
      categoryTotals.set(e.categoryId, {
        amount: existing.amount + e.amount,
        count: existing.count + 1,
      });
    }

    return [...categoryTotals.entries()]
      .map(([catId, { amount, count }]) => {
        const cat = catMap.get(catId);
        return {
          categoryId: catId,
          categoryName: cat?.name ?? 'Unknown',
          categoryColor: cat?.color ?? '#6366f1',
          categoryIcon: cat?.icon ?? 'circle',
          amount,
          percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0,
          transactionCount: count,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }

  function getSpendingByPeriod(
    dateRange: DateRange,
    groupBy: 'day' | 'week' | 'month'
  ): SpendingByPeriod[] {
    const expenses = filterExpenses(dateRange);

    if (groupBy === 'day') {
      const days = getDaysInRange(dateRange);
      return days.map(day => {
        const dayExpenses = expenses.filter(e => e.date === day);
        return {
          period: day,
          amount: dayExpenses.reduce((s, e) => s + e.amount, 0),
          transactionCount: dayExpenses.length,
        };
      });
    }

    if (groupBy === 'week') {
      const weeks = getWeeksInRange(dateRange, 1);
      return weeks.map(weekStart => {
        const weekEnd = format(
          new Date(new Date(weekStart).getTime() + 6 * 86400000),
          'yyyy-MM-dd'
        );
        const weekExpenses = expenses.filter(e => e.date >= weekStart && e.date <= weekEnd);
        return {
          period: weekStart,
          amount: weekExpenses.reduce((s, e) => s + e.amount, 0),
          transactionCount: weekExpenses.length,
        };
      });
    }

    // month
    const months = getMonthsInRange(dateRange);
    return months.map(month => {
      const monthExpenses = expenses.filter(e => e.date.startsWith(month));
      return {
        period: month,
        amount: monthExpenses.reduce((s, e) => s + e.amount, 0),
        transactionCount: monthExpenses.length,
      };
    });
  }

  function getSpendingHighlights(dateRange: DateRange): SpendingHighlights {
    const expenses = filterExpenses(dateRange);

    if (expenses.length === 0) {
      return {
        highestSpendingDay: null,
        lowestSpendingDay: null,
        highestSpendingWeek: null,
        highestSpendingMonth: null,
        mostExpensiveCategory: null,
        mostUsedPaymentMethod: null,
        largestExpense: null,
        averageDailySpending: 0,
        averageMonthlySpending: 0,
        noSpendDays: 0,
        totalTransactions: 0,
      };
    }

    // By day
    const byDay = new Map<string, number>();
    for (const e of expenses) {
      byDay.set(e.date, (byDay.get(e.date) ?? 0) + e.amount);
    }
    const dayEntries = [...byDay.entries()].sort((a, b) => b[1] - a[1]);
    const highestDay = dayEntries[0];
    const lowestDay = dayEntries[dayEntries.length - 1];

    // All days in range
    const allDays = eachDayOfInterval({
      start: parseISO(dateRange.from),
      end: parseISO(dateRange.to),
    }).map(d => format(d, 'yyyy-MM-dd'));
    const noSpendDays = allDays.filter(d => !byDay.has(d)).length;

    // Largest single expense
    const largestExpense = expenses.reduce((max, e) => e.amount > max.amount ? e : max, expenses[0]);

    // Categories
    const catTotals = new Map<string, { amount: number; count: number }>();
    for (const e of expenses) {
      const ex = catTotals.get(e.categoryId) ?? { amount: 0, count: 0 };
      catTotals.set(e.categoryId, { amount: ex.amount + e.amount, count: ex.count + 1 });
    }
    const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
    const topCat = [...catTotals.entries()].sort((a, b) => b[1].amount - a[1].amount)[0];
    const mostExpensiveCategory: CategorySpending | null = topCat
      ? (() => {
          const cat = catMap.get(topCat[0]);
          return {
            categoryId: topCat[0],
            categoryName: cat?.name ?? 'Unknown',
            categoryColor: cat?.color ?? '#6366f1',
            categoryIcon: cat?.icon ?? 'circle',
            amount: topCat[1].amount,
            percentage: totalSpent > 0 ? (topCat[1].amount / totalSpent) * 100 : 0,
            transactionCount: topCat[1].count,
          };
        })()
      : null;

    // Payment methods
    const pmTotals = new Map<string, number>();
    for (const e of expenses) {
      pmTotals.set(e.paymentMethodId, (pmTotals.get(e.paymentMethodId) ?? 0) + 1);
    }
    const topPm = [...pmTotals.entries()].sort((a, b) => b[1] - a[1])[0];
    const mostUsedPaymentMethod = topPm
      ? { methodId: topPm[0], name: pmMap.get(topPm[0])?.name ?? 'Unknown', count: topPm[1] }
      : null;

    // Average
    const days = allDays.length || 1;
    const months = Math.max(1, Math.ceil(days / 30));

    return {
      highestSpendingDay: highestDay ? { date: highestDay[0], amount: highestDay[1] } : null,
      lowestSpendingDay: lowestDay ? { date: lowestDay[0], amount: lowestDay[1] } : null,
      highestSpendingWeek: null, // Could implement but keeping it simple
      highestSpendingMonth: null,
      mostExpensiveCategory,
      mostUsedPaymentMethod,
      largestExpense,
      averageDailySpending: totalSpent / days,
      averageMonthlySpending: totalSpent / months,
      noSpendDays,
      totalTransactions: expenses.length,
    };
  }

  function getSpendingComparison(period: 'week' | 'month' | 'year'): SpendingComparison {
    const { format: fmtFn } = { format };
    const now = new Date();

    let currentFrom: string;
    let currentTo: string;
    let prevFrom: string;
    let prevTo: string;
    let currentLabel: string;
    let prevLabel: string;

    if (period === 'month') {
      const { startOfMonth, endOfMonth, subMonths } = { startOfMonth: (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1), endOfMonth: (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0), subMonths: (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() - n, d.getDate()) };
      const curStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const curEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      currentFrom = fmtFn(curStart, 'yyyy-MM-dd');
      currentTo = fmtFn(curEnd, 'yyyy-MM-dd');
      prevFrom = fmtFn(prevStart, 'yyyy-MM-dd');
      prevTo = fmtFn(prevEnd, 'yyyy-MM-dd');
      currentLabel = fmtFn(curStart, 'MMMM yyyy');
      prevLabel = fmtFn(prevStart, 'MMMM yyyy');
    } else if (period === 'week') {
      const prevRange = getPreviousDateRange('week', 1);
      const curMonday = startOfWeek(now, { weekStartsOn: 1 });
      currentFrom = fmtFn(curMonday, 'yyyy-MM-dd');
      currentTo = fmtFn(now, 'yyyy-MM-dd');
      prevFrom = prevRange.from;
      prevTo = prevRange.to;
      currentLabel = 'This Week';
      prevLabel = 'Last Week';
    } else {
      const curStart = new Date(now.getFullYear(), 0, 1);
      const prevStart = new Date(now.getFullYear() - 1, 0, 1);
      const prevEnd = new Date(now.getFullYear() - 1, 11, 31);
      currentFrom = fmtFn(curStart, 'yyyy-MM-dd');
      currentTo = fmtFn(now, 'yyyy-MM-dd');
      prevFrom = fmtFn(prevStart, 'yyyy-MM-dd');
      prevTo = fmtFn(prevEnd, 'yyyy-MM-dd');
      currentLabel = String(now.getFullYear());
      prevLabel = String(now.getFullYear() - 1);
    }

    const currentExpenses = filterExpenses({ from: currentFrom, to: currentTo });
    const prevExpenses = filterExpenses({ from: prevFrom, to: prevTo });

    const currentAmount = currentExpenses.reduce((s, e) => s + e.amount, 0);
    const previousAmount = prevExpenses.reduce((s, e) => s + e.amount, 0);
    const absoluteChange = currentAmount - previousAmount;
    const percentageChange = previousAmount > 0
      ? ((currentAmount - previousAmount) / previousAmount) * 100
      : currentAmount > 0 ? 100 : 0;

    return {
      currentPeriod: currentLabel,
      previousPeriod: prevLabel,
      currentAmount,
      previousAmount,
      absoluteChange,
      percentageChange,
      direction: absoluteChange > 0 ? 'increase' : absoluteChange < 0 ? 'decrease' : 'same',
    };
  }

  function getPaymentMethodDistribution(dateRange: DateRange) {
    const expenses = filterExpenses(dateRange);
    const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);
    const pmTotals = new Map<string, { amount: number; count: number }>();

    for (const e of expenses) {
      const ex = pmTotals.get(e.paymentMethodId) ?? { amount: 0, count: 0 };
      pmTotals.set(e.paymentMethodId, {
        amount: ex.amount + e.amount,
        count: ex.count + 1,
      });
    }

    return [...pmTotals.entries()]
      .map(([pmId, { amount, count }]) => {
        const pm = pmMap.get(pmId);
        return {
          paymentMethodId: pmId,
          name: pm?.name ?? 'Unknown',
          color: pm?.color ?? '#6366f1',
          amount,
          count,
          percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }

  function getClassificationBreakdown(dateRange: DateRange) {
    const expenses = filterExpenses(dateRange);
    const necessary = expenses.filter(e => e.classification === 'necessary').reduce((s, e) => s + e.amount, 0);
    const discretionary = expenses.filter(e => e.classification === 'discretionary').reduce((s, e) => s + e.amount, 0);
    const total = necessary + discretionary;

    return {
      necessary,
      discretionary,
      necessaryPercentage: total > 0 ? (necessary / total) * 100 : 0,
      discretionaryPercentage: total > 0 ? (discretionary / total) * 100 : 0,
      total,
    };
  }

  function getNoSpendDays(dateRange: DateRange): number {
    const expenses = filterExpenses(dateRange);
    const spendDays = new Set(expenses.map(e => e.date));
    const allDays = eachDayOfInterval({
      start: parseISO(dateRange.from),
      end: parseISO(dateRange.to),
    });
    return allDays.filter(d => !spendDays.has(format(d, 'yyyy-MM-dd'))).length;
  }

  function getDayOfWeekBreakdown(dateRange: DateRange) {
    const expenses = filterExpenses(dateRange);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const totals = new Array(7).fill(0);

    for (const e of expenses) {
      const dow = getDay(parseISO(e.date));
      totals[dow] += e.amount;
    }

    return days.map((name, idx) => ({ day: name, amount: totals[idx] }));
  }

  function getTopMerchants(dateRange: DateRange, limit = 5) {
    const expenses = filterExpenses(dateRange);
    const merchantTotals = new Map<string, { amount: number; count: number }>();

    for (const e of expenses) {
      if (e.merchant) {
        const ex = merchantTotals.get(e.merchant) ?? { amount: 0, count: 0 };
        merchantTotals.set(e.merchant, {
          amount: ex.amount + e.amount,
          count: ex.count + 1,
        });
      }
    }

    return [...merchantTotals.entries()]
      .map(([name, { amount, count }]) => ({ name, amount, count }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limit);
  }

  return {
    allExpenses,
    allIncome,
    allCategories,
    allPaymentMethods,
    allBudgets,
    getSpendingByCategory,
    getSpendingByPeriod,
    getSpendingHighlights,
    getSpendingComparison,
    getPaymentMethodDistribution,
    getClassificationBreakdown,
    getNoSpendDays,
    getDayOfWeekBreakdown,
    getTopMerchants,
  };
}
