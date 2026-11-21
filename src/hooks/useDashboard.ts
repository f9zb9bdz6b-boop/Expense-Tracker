// ============================================================
// useDashboard Hook - Computes DashboardSummary from database
// ============================================================
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { format, startOfMonth, endOfMonth, startOfWeek, startOfDay, endOfDay } from 'date-fns';
import { convertMinorUnits } from '@/utils/currency';
import type {
  DashboardSummary, CategorySpending, BudgetProgress,
  GoalProgress, Expense, Income, ExpenseCategory, Budget, FinancialGoal, RecurringTransaction,
} from '@/types';

function toBaseInr(amount: number, currency?: string): number {
  if (!currency || currency === 'INR') return amount;
  return convertMinorUnits(amount, currency, 'INR');
}

function getCurrentMonthRange() {
  const now = new Date();
  return {
    from: format(startOfMonth(now), 'yyyy-MM-dd'),
    to: format(endOfMonth(now), 'yyyy-MM-dd'),
  };
}

function getCurrentWeekRange() {
  const now = new Date();
  return {
    from: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    to: format(now, 'yyyy-MM-dd'),
  };
}

function getTodayRange() {
  const now = new Date();
  return {
    from: format(startOfDay(now), 'yyyy-MM-dd'),
    to: format(endOfDay(now), 'yyyy-MM-dd'),
  };
}

export function useDashboard(): { summary: DashboardSummary | null; isLoading: boolean } {
  const result = useLiveQuery(async () => {
    const monthRange = getCurrentMonthRange();
    const weekRange = getCurrentWeekRange();
    const todayRange = getTodayRange();

    // Fetch data in parallel
    const [
      allExpenses,
      allIncome,
      monthExpenses,
      monthIncome,
      weekExpenses,
      todayExpenses,
      categories,
      activeBudgets,
      activeGoals,
      activeRecurring,
    ] = await Promise.all([
      db.expenses.orderBy('date').reverse().toArray() as Promise<Expense[]>,
      db.income.orderBy('date').reverse().toArray() as Promise<Income[]>,
      db.expenses.where('date').between(monthRange.from, monthRange.to, true, true).toArray() as Promise<Expense[]>,
      db.income.where('date').between(monthRange.from, monthRange.to, true, true).toArray() as Promise<Income[]>,
      db.expenses.where('date').between(weekRange.from, weekRange.to, true, true).toArray() as Promise<Expense[]>,
      db.expenses.where('date').between(todayRange.from, todayRange.to, true, true).toArray() as Promise<Expense[]>,
      db.expenseCategories.orderBy('order').toArray() as Promise<ExpenseCategory[]>,
      db.budgets.where('isActive').equals(1).toArray() as Promise<Budget[]>,
      db.financialGoals.where('status').equals('active').toArray() as Promise<FinancialGoal[]>,
      db.recurringTransactions.where('isActive').equals(1).toArray() as Promise<RecurringTransaction[]>,
    ]);

    const totalExpenses = allExpenses.reduce((s: number, e: Expense) => s + toBaseInr(e.amount, e.currency), 0);
    const totalIncome = allIncome.reduce((s: number, i: Income) => s + toBaseInr(i.amount, i.currency), 0);
    const netBalance = totalIncome - totalExpenses;

    const currentMonthSpending = monthExpenses.reduce((s: number, e: Expense) => s + toBaseInr(e.amount, e.currency), 0);
    const currentMonthIncome = monthIncome.reduce((s: number, i: Income) => s + toBaseInr(i.amount, i.currency), 0);
    const currentWeekSpending = weekExpenses.reduce((s: number, e: Expense) => s + toBaseInr(e.amount, e.currency), 0);
    const todaySpending = todayExpenses.reduce((s: number, e: Expense) => s + toBaseInr(e.amount, e.currency), 0);

    const monthNecessary = monthExpenses
      .filter((e: Expense) => e.classification === 'necessary')
      .reduce((s: number, e: Expense) => s + toBaseInr(e.amount, e.currency), 0);
    const monthDiscretionary = monthExpenses
      .filter((e: Expense) => e.classification === 'discretionary')
      .reduce((s: number, e: Expense) => s + toBaseInr(e.amount, e.currency), 0);

    const allNecessary = allExpenses
      .filter((e: Expense) => e.classification === 'necessary')
      .reduce((s: number, e: Expense) => s + toBaseInr(e.amount, e.currency), 0);
    const allDiscretionary = allExpenses
      .filter((e: Expense) => e.classification === 'discretionary')
      .reduce((s: number, e: Expense) => s + toBaseInr(e.amount, e.currency), 0);

    const necessaryExpenses = (monthNecessary > 0 || monthDiscretionary > 0) ? monthNecessary : allNecessary;
    const discretionaryExpenses = (monthNecessary > 0 || monthDiscretionary > 0) ? monthDiscretionary : allDiscretionary;

    // Build category map
    const catMap = new Map<string, ExpenseCategory>(categories.map((c: ExpenseCategory) => [c.id, c]));

    // Top categories this month
    const categoryTotals = new Map<string, number>();
    for (const e of monthExpenses) {
      categoryTotals.set(e.categoryId, (categoryTotals.get(e.categoryId) ?? 0) + toBaseInr(e.amount, e.currency));
    }
    const sortedCategories = [...categoryTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topCategories: CategorySpending[] = sortedCategories.map(([catId, amount]) => {
      const cat = catMap.get(catId);
      const catExpenses = monthExpenses.filter((e: Expense) => e.categoryId === catId);
      return {
        categoryId: catId,
        categoryName: cat?.name ?? 'Unknown',
        categoryColor: cat?.color ?? '#6366f1',
        categoryIcon: cat?.icon ?? 'Circle',
        amount,
        percentage: currentMonthSpending > 0 ? (amount / currentMonthSpending) * 100 : 0,
        transactionCount: catExpenses.length,
      };
    });

    // Recent transactions (last 10 combined)
    const recentExpenses: (Expense | Income)[] = allExpenses.slice(0, 10);
    const recentIncomeItems: (Expense | Income)[] = allIncome.slice(0, 10);
    const combined = [...recentExpenses, ...recentIncomeItems]
      .sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        return b.createdAt - a.createdAt;
      })
      .slice(0, 10);

    // Budget progress
    const budgetProgress: BudgetProgress[] = activeBudgets.map((budget: Budget) => {
      let spent = 0;
      if (budget.categoryId) {
        const catExpenses = monthExpenses.filter((e: Expense) => e.categoryId === budget.categoryId);
        spent = catExpenses.reduce((s: number, e: Expense) => s + e.amount, 0);
      } else {
        spent = currentMonthSpending;
      }
      const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
      let status: BudgetProgress['status'] = 'safe';
      if (percentage >= 100) status = 'exceeded';
      else if (percentage >= 90) status = 'danger';
      else if (percentage >= 75) status = 'warning';

      return {
        budgetId: budget.id,
        budgetName: budget.name,
        budgetAmount: budget.amount,
        spent,
        remaining: Math.max(0, budget.amount - spent),
        percentage,
        status,
      };
    });

    const remainingBudget = budgetProgress.reduce((s, b) => s + b.remaining, 0);

    // Goal progress
    const goalProgress: GoalProgress[] = activeGoals.map((goal: FinancialGoal) => ({
      goalId: goal.id,
      goalName: goal.name,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      percentage: goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0,
      targetDate: goal.targetDate,
    }));

    const sortedRecurring = activeRecurring
      .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))
      .slice(0, 5);

    const summary: DashboardSummary = {
      totalIncome,
      totalExpenses,
      netBalance,
      currentMonthSpending,
      currentMonthIncome,
      currentWeekSpending,
      todaySpending,
      necessaryExpenses,
      discretionaryExpenses,
      remainingBudget,
      topCategories,
      recentTransactions: combined,
      budgetProgress,
      upcomingRecurring: sortedRecurring,
      goalProgress,
    };

    return summary;
  });

  return {
    summary: result ?? null,
    isLoading: result === undefined,
  };
}
