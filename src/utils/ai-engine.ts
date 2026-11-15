// ============================================================
// Local AI Engine - Intelligent Financial Insights & Recommendations
// Works 100% offline using rule-based and statistical analysis
// ============================================================
import type {
  Expense, Income, Budget, FinancialGoal,
  AIInsight, FinancialHealthScore, ExpenseCategory
} from '@/types';
import { formatCurrency, fromMinorUnits } from '@/utils/currency';

export function calculateFinancialHealth(
  expenses: Expense[],
  income: Income[],
  budgets: Budget[],
  goals: FinancialGoal[]
): FinancialHealthScore {
  const totalIncome = income.reduce((s, i) => s + i.amount, 0);
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);

  // 1. Savings Rate Score (0 - 100)
  // Target: 20%+ savings
  let savingsRate = 50;
  if (totalIncome > 0) {
    const rate = ((totalIncome - totalExpense) / totalIncome) * 100;
    savingsRate = Math.min(100, Math.max(0, rate * 3.33)); // 30% savings = 100 score
  }

  // 2. Budget Adherence Score (0 - 100)
  let budgetScore = 70;
  if (budgets.length > 0) {
    let adheredCount = 0;
    for (const b of budgets) {
      const spent = b.categoryId
        ? expenses.filter(e => e.categoryId === b.categoryId).reduce((s, e) => s + e.amount, 0)
        : totalExpense;
      if (spent <= b.amount) adheredCount++;
    }
    budgetScore = (adheredCount / budgets.length) * 100;
  }

  // 3. Spending Consistency (0 - 100)
  const spendingConsistency = 75;

  // 4. Emergency / Goal Progress (0 - 100)
  let goalScore = 60;
  if (goals.length > 0) {
    const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
    const totalCurrent = goals.reduce((s, g) => s + g.currentAmount, 0);
    goalScore = totalTarget > 0 ? Math.min(100, (totalCurrent / totalTarget) * 100) : 50;
  }

  // 5. Discretionary Control (0 - 100)
  // Ideal: 50% needs, 30% wants, 20% savings
  const discretionaryExpense = expenses
    .filter(e => e.classification === 'discretionary')
    .reduce((s, e) => s + e.amount, 0);
  let discretionaryControl = 80;
  if (totalExpense > 0) {
    const discRatio = discretionaryExpense / totalExpense;
    if (discRatio <= 0.3) discretionaryControl = 95;
    else if (discRatio <= 0.5) discretionaryControl = 75;
    else discretionaryControl = Math.max(20, 100 - discRatio * 100);
  }

  const overall = Math.round(
    savingsRate * 0.3 +
    budgetScore * 0.25 +
    discretionaryControl * 0.2 +
    goalScore * 0.15 +
    spendingConsistency * 0.1
  );

  return {
    overall: Math.min(100, Math.max(0, overall)),
    budgetAdherence: Math.round(budgetScore),
    savingsRate: Math.round(savingsRate),
    spendingConsistency: Math.round(spendingConsistency),
    emergencyFundProgress: Math.round(goalScore),
    discretionaryControl: Math.round(discretionaryControl),
    lastCalculated: Date.now(),
  };
}

export function generateSmartInsights(
  expenses: Expense[],
  income: Income[],
  categories: ExpenseCategory[],
  budgets: Budget[]
): AIInsight[] {
  const insights: AIInsight[] = [];
  const catMap = new Map(categories.map(c => [c.id, c]));
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);
  const totalIncome = income.reduce((s, i) => s + i.amount, 0);

  // 1. Savings analysis
  if (totalIncome > 0) {
    const net = totalIncome - totalExpense;
    const savingsPercent = Math.round((net / totalIncome) * 100);
    if (net > 0) {
      insights.push({
        id: 'ins-savings-pos',
        type: 'observation',
        title: 'Positive Cash Flow',
        message: `You've retained ${savingsPercent}% of your income (${formatCurrency(net)}) as savings so far!`,
        confidence: 95,
        createdAt: Date.now(),
        isActionable: false,
      });
    } else if (net < 0) {
      insights.push({
        id: 'ins-savings-neg',
        type: 'warning',
        title: 'Expenses Exceeding Income',
        message: `Total spending is currently exceeding your income by ${formatCurrency(Math.abs(net))}. Review non-essential purchases.`,
        confidence: 98,
        createdAt: Date.now(),
        isActionable: true,
        action: 'Review Discretionary Spending',
      });
    }
  }

  // 2. Discretionary ratio
  const discretionaryExpense = expenses
    .filter(e => e.classification === 'discretionary')
    .reduce((s, e) => s + e.amount, 0);
  if (totalExpense > 0) {
    const discPercent = Math.round((discretionaryExpense / totalExpense) * 100);
    if (discPercent > 40) {
      insights.push({
        id: 'ins-disc-high',
        type: 'recommendation',
        title: 'High Discretionary Spending',
        message: `${discPercent}% of your spending is on discretionary items (${formatCurrency(discretionaryExpense)}). Trimming this by 10-15% could boost your monthly savings substantially.`,
        confidence: 90,
        createdAt: Date.now(),
        isActionable: true,
        action: 'View Discretionary Expenses',
      });
    }
  }

  // 3. Top category insight
  const catTotals = new Map<string, number>();
  for (const e of expenses) {
    catTotals.set(e.categoryId, (catTotals.get(e.categoryId) ?? 0) + e.amount);
  }
  const sortedCats = [...catTotals.entries()].sort((a, b) => b[1] - a[1]);
  if (sortedCats.length > 0) {
    const [topCatId, topAmount] = sortedCats[0];
    const topCat = catMap.get(topCatId);
    const catPercent = totalExpense > 0 ? Math.round((topAmount / totalExpense) * 100) : 0;
    if (catPercent >= 30 && topCat) {
      insights.push({
        id: 'ins-top-cat',
        type: 'observation',
        title: `Heavy Spending on ${topCat.name}`,
        message: `${topCat.name} accounts for ${catPercent}% of all recorded expenses (${formatCurrency(topAmount)}).`,
        category: topCat.name,
        confidence: 92,
        createdAt: Date.now(),
        isActionable: false,
      });
    }
  }

  // 4. Budget alerts
  for (const b of budgets) {
    if (!b.isActive) continue;
    const spent = b.categoryId
      ? expenses.filter(e => e.categoryId === b.categoryId).reduce((s, e) => s + e.amount, 0)
      : totalExpense;
    const pct = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;
    if (pct >= 90) {
      insights.push({
        id: `ins-budget-${b.id}`,
        type: pct >= 100 ? 'warning' : 'tip',
        title: pct >= 100 ? `Budget Exceeded: ${b.name}` : `Budget Alert: ${b.name}`,
        message: `You've used ${pct}% of your ${formatCurrency(b.amount)} budget (${formatCurrency(spent)} spent).`,
        confidence: 100,
        createdAt: Date.now(),
        isActionable: true,
        action: 'Adjust Budget',
      });
    }
  }

  // Fallback tip if few insights
  if (insights.length === 0) {
    insights.push({
      id: 'ins-general-tip',
      type: 'tip',
      title: 'Track Consistently',
      message: 'Log daily expenses as they happen or snap receipts to keep analytics accurate and insightful.',
      confidence: 85,
      createdAt: Date.now(),
      isActionable: false,
    });
  }

  return insights;
}

export function answerFinancialQuestion(
  question: string,
  expenses: Expense[],
  income: Income[],
  categories: ExpenseCategory[],
  budgets: Budget[]
): string {
  const q = question.toLowerCase();
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);
  const totalIncome = income.reduce((s, i) => s + i.amount, 0);
  const catMap = new Map(categories.map(c => [c.id, c]));

  if (q.includes('where') && (q.includes('money') || q.includes('spend') || q.includes('go'))) {
    const catTotals = new Map<string, number>();
    for (const e of expenses) {
      catTotals.set(e.categoryId, (catTotals.get(e.categoryId) ?? 0) + e.amount);
    }
    const sorted = [...catTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
    if (sorted.length === 0) return 'You have not recorded any expenses yet. Add your first expense to see breakdowns!';
    const details = sorted
      .map(([id, amt]) => `• **${catMap.get(id)?.name ?? 'Unknown'}**: ${formatCurrency(amt)} (${Math.round((amt / totalExpense) * 100)}%)`)
      .join('\n');
    return `Here is where most of your money went across all recorded expenses (Total: ${formatCurrency(totalExpense)}):\n\n${details}`;
  }

  if (q.includes('save') || q.includes('saving') || q.includes('cut')) {
    const disc = expenses.filter(e => e.classification === 'discretionary').reduce((s, e) => s + e.amount, 0);
    const discPct = totalExpense > 0 ? Math.round((disc / totalExpense) * 100) : 0;
    return `Your discretionary spending is currently **${formatCurrency(disc)}** (${discPct}% of total expenses).\n\n💡 **Actionable Recommendation**: If you reduce discretionary purchases by 20%, you could save an extra **${formatCurrency(Math.round(disc * 0.2))}** each month! Focus on dining out, spontaneous shopping, and non-essential subscriptions.`;
  }

  if (q.includes('budget') || q.includes('limit')) {
    if (budgets.length === 0) {
      return `You haven't set up any active budgets yet! Setting monthly limits on categories like Food and Shopping can help keep expenses under control. Head to the **Budgets** page to create one.`;
    }
    const summaries = budgets.map(b => {
      const spent = b.categoryId
        ? expenses.filter(e => e.categoryId === b.categoryId).reduce((s, e) => s + e.amount, 0)
        : totalExpense;
      const pct = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;
      return `• **${b.name}**: ${formatCurrency(spent)} / ${formatCurrency(b.amount)} (${pct}% used)`;
    }).join('\n');
    return `Here is your current budget status:\n\n${summaries}`;
  }

  if (q.includes('income') || q.includes('earn')) {
    const net = totalIncome - totalExpense;
    return `**Financial Summary**:\n• Total Income: ${formatCurrency(totalIncome)}\n• Total Expenses: ${formatCurrency(totalExpense)}\n• Net Balance: **${formatCurrency(net)}** (${net >= 0 ? 'Surplus' : 'Deficit'})`;
  }

  // Default response with comprehensive snapshot
  return `Based on your ${expenses.length} recorded transactions:\n• **Total Expenses**: ${formatCurrency(totalExpense)}\n• **Total Income**: ${formatCurrency(totalIncome)}\n• **Net Balance**: ${formatCurrency(totalIncome - totalExpense)}\n\nYou can ask me specific questions like:\n- "Where did most of my money go?"\n- "How much can I realistically save?"\n- "Am I staying within my budget?"\n- "What is my net balance?"`;
}
