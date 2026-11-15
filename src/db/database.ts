// ============================================================
// Dexie.js Database Schema and Configuration
// ============================================================
import Dexie, { type Table } from 'dexie';
import type {
  Expense, Income, ExpenseCategory, IncomeCategory,
  PaymentMethod, Budget, SpecialEvent, RecurringTransaction,
  FinancialGoal, SavingsContribution, SavingsChallenge,
  Receipt, ExpenseSplit, SplitParticipant, Merchant,
  PriceRecord, Notification, UserSettings,
} from '@/types';

export class ExpenseTrackerDB extends Dexie {
  expenses!: Table<Expense>;
  income!: Table<Income>;
  expenseCategories!: Table<ExpenseCategory>;
  incomeCategories!: Table<IncomeCategory>;
  paymentMethods!: Table<PaymentMethod>;
  budgets!: Table<Budget>;
  events!: Table<SpecialEvent>;
  recurringTransactions!: Table<RecurringTransaction>;
  financialGoals!: Table<FinancialGoal>;
  savingsContributions!: Table<SavingsContribution>;
  savingsChallenges!: Table<SavingsChallenge>;
  receipts!: Table<Receipt>;
  expenseSplits!: Table<ExpenseSplit>;
  splitParticipants!: Table<SplitParticipant>;
  merchants!: Table<Merchant>;
  priceRecords!: Table<PriceRecord>;
  notifications!: Table<Notification>;
  settings!: Table<UserSettings>;

  constructor() {
    super('ExpenseTrackerDB');

    this.version(1).stores({
      expenses: 'id, date, categoryId, paymentMethodId, eventId, merchant, classification, [date+categoryId], [date+paymentMethodId], createdAt',
      income: 'id, date, categoryId, source, createdAt',
      expenseCategories: 'id, name, parentId, order, isArchived',
      incomeCategories: 'id, name, order, isArchived',
      paymentMethods: 'id, name, order, isArchived',
      budgets: 'id, period, categoryId, isActive, startDate',
      events: 'id, name, status, startDate, endDate',
      recurringTransactions: 'id, type, frequency, nextDueDate, isActive',
      financialGoals: 'id, status, targetDate',
      savingsContributions: 'id, goalId, date',
      savingsChallenges: 'id, status, startDate',
      receipts: 'id, expenseId, isProcessed',
      expenseSplits: 'id, expenseId, isSettled',
      splitParticipants: 'id, splitId, isSettled',
      merchants: 'id, name, category',
      priceRecords: 'id, itemName, date, merchant',
      notifications: 'id, type, isRead, createdAt, priority',
      settings: 'id',
    });
  }
}

export const db = new ExpenseTrackerDB();

// --- Seed default data ---
export async function seedDefaultData(): Promise<void> {
  const settingsCount = await db.settings.count();
  if (settingsCount > 0) return; // Already seeded

  const now = Date.now();

  // Default settings
  await db.settings.put({
    id: 'user-settings',
    currency: {
      code: 'INR',
      symbol: '₹',
      name: 'Indian Rupee',
      decimalPlaces: 2,
      symbolPosition: 'before',
    },
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '12h',
    theme: 'system',
    defaultClassification: 'necessary',
    budgetAlertThresholds: [50, 75, 90, 100],
    showDecimal: true,
    weekStartsOn: 1,
    enableNotifications: true,
    enableBrowserNotifications: false,
    hasCompletedOnboarding: false,
    backupReminder: true,
    backupReminderDays: 7,
    createdAt: now,
    updatedAt: now,
  });

  // Default expense categories
  const defaultExpenseCategories: Omit<ExpenseCategory, 'id' | 'createdAt' | 'updatedAt'>[] = [
    { name: 'Food', icon: 'UtensilsCrossed', color: '#ef4444', order: 0, isDefault: true, isArchived: false },
    { name: 'Groceries', icon: 'ShoppingCart', color: '#f97316', order: 1, isDefault: true, isArchived: false },
    { name: 'Transportation', icon: 'Car', color: '#eab308', order: 2, isDefault: true, isArchived: false },
    { name: 'Shopping', icon: 'ShoppingBag', color: '#84cc16', order: 3, isDefault: true, isArchived: false },
    { name: 'Entertainment', icon: 'Film', color: '#22c55e', order: 4, isDefault: true, isArchived: false },
    { name: 'Education', icon: 'GraduationCap', color: '#14b8a6', order: 5, isDefault: true, isArchived: false },
    { name: 'Healthcare', icon: 'Heart', color: '#06b6d4', order: 6, isDefault: true, isArchived: false },
    { name: 'Rent', icon: 'Home', color: '#3b82f6', order: 7, isDefault: true, isArchived: false },
    { name: 'Utilities', icon: 'Zap', color: '#6366f1', order: 8, isDefault: true, isArchived: false },
    { name: 'Travel', icon: 'Plane', color: '#8b5cf6', order: 9, isDefault: true, isArchived: false },
    { name: 'Subscriptions', icon: 'CreditCard', color: '#a855f7', order: 10, isDefault: true, isArchived: false },
    { name: 'Personal Care', icon: 'Sparkles', color: '#d946ef', order: 11, isDefault: true, isArchived: false },
    { name: 'Gifts', icon: 'Gift', color: '#ec4899', order: 12, isDefault: true, isArchived: false },
    { name: 'Other', icon: 'MoreHorizontal', color: '#6b7280', order: 13, isDefault: true, isArchived: false },
  ];

  await db.expenseCategories.bulkPut(
    defaultExpenseCategories.map((cat, i) => ({
      ...cat,
      id: `cat-exp-${i}`,
      createdAt: now,
      updatedAt: now,
    }))
  );

  // Default income categories
  const defaultIncomeCategories: Omit<IncomeCategory, 'id' | 'createdAt' | 'updatedAt'>[] = [
    { name: 'Salary', icon: 'Briefcase', color: '#22c55e', order: 0, isDefault: true, isArchived: false },
    { name: 'Freelance', icon: 'Laptop', color: '#3b82f6', order: 1, isDefault: true, isArchived: false },
    { name: 'Business', icon: 'Building2', color: '#8b5cf6', order: 2, isDefault: true, isArchived: false },
    { name: 'Gifts', icon: 'Gift', color: '#ec4899', order: 3, isDefault: true, isArchived: false },
    { name: 'Allowance', icon: 'Wallet', color: '#f97316', order: 4, isDefault: true, isArchived: false },
    { name: 'Investment', icon: 'TrendingUp', color: '#14b8a6', order: 5, isDefault: true, isArchived: false },
    { name: 'Other', icon: 'MoreHorizontal', color: '#6b7280', order: 6, isDefault: true, isArchived: false },
  ];

  await db.incomeCategories.bulkPut(
    defaultIncomeCategories.map((cat, i) => ({
      ...cat,
      id: `cat-inc-${i}`,
      createdAt: now,
      updatedAt: now,
    }))
  );

  // Default payment methods
  const defaultPaymentMethods: Omit<PaymentMethod, 'id' | 'createdAt' | 'updatedAt'>[] = [
    { name: 'Cash', icon: 'Banknote', color: '#22c55e', isDefault: true, isArchived: false, order: 0 },
    { name: 'UPI', icon: 'Smartphone', color: '#6366f1', isDefault: true, isArchived: false, order: 1 },
    { name: 'GPay', icon: 'Wallet', color: '#3b82f6', isDefault: true, isArchived: false, order: 2 },
    { name: 'Credit Card', icon: 'CreditCard', color: '#ef4444', isDefault: true, isArchived: false, order: 3 },
    { name: 'Debit Card', icon: 'CreditCard', color: '#f97316', isDefault: true, isArchived: false, order: 4 },
    { name: 'Bank Transfer', icon: 'Building2', color: '#14b8a6', isDefault: true, isArchived: false, order: 5 },
    { name: 'Other', icon: 'MoreHorizontal', color: '#6b7280', isDefault: true, isArchived: false, order: 6 },
  ];

  await db.paymentMethods.bulkPut(
    defaultPaymentMethods.map((pm, i) => ({
      ...pm,
      id: `pm-${i}`,
      createdAt: now,
      updatedAt: now,
    }))
  );
}
