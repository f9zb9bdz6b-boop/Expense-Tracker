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

import { getCategoryEmoji, getPaymentMethodEmoji } from '@/utils/emojis';

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
  if (settingsCount > 0) {
    // Migration: ensure any legacy icons are upgraded to rich emojis
    try {
      const allCats = await db.expenseCategories.toArray();
      for (const cat of allCats) {
        if (!cat.icon || !/\p{Extended_Pictographic}/u.test(cat.icon)) {
          await db.expenseCategories.update(cat.id, { icon: getCategoryEmoji(cat) });
        }
      }
      const allIncCats = await db.incomeCategories.toArray();
      for (const cat of allIncCats) {
        if (!cat.icon || !/\p{Extended_Pictographic}/u.test(cat.icon)) {
          await db.incomeCategories.update(cat.id, { icon: getCategoryEmoji(cat) });
        }
      }
      const allPms = await db.paymentMethods.toArray();
      for (const pm of allPms) {
        if (!pm.icon || !/\p{Extended_Pictographic}/u.test(pm.icon)) {
          await db.paymentMethods.update(pm.id, { icon: getPaymentMethodEmoji(pm.name) });
        }
      }
    } catch (e) {
      // Silently handle migration errors
    }
    return;
  }

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

  // Default expense categories with expressive emojis
  const defaultExpenseCategories: Omit<ExpenseCategory, 'id' | 'createdAt' | 'updatedAt'>[] = [
    { name: 'Food', icon: '🍔', color: '#ef4444', order: 0, isDefault: true, isArchived: false },
    { name: 'Groceries', icon: '🛒', color: '#f97316', order: 1, isDefault: true, isArchived: false },
    { name: 'Transportation', icon: '🚗', color: '#eab308', order: 2, isDefault: true, isArchived: false },
    { name: 'Shopping', icon: '🛍️', color: '#84cc16', order: 3, isDefault: true, isArchived: false },
    { name: 'Entertainment', icon: '🎬', color: '#22c55e', order: 4, isDefault: true, isArchived: false },
    { name: 'Education', icon: '📚', color: '#14b8a6', order: 5, isDefault: true, isArchived: false },
    { name: 'Healthcare', icon: '💊', color: '#06b6d4', order: 6, isDefault: true, isArchived: false },
    { name: 'Rent', icon: '🏠', color: '#3b82f6', order: 7, isDefault: true, isArchived: false },
    { name: 'Utilities', icon: '⚡', color: '#6366f1', order: 8, isDefault: true, isArchived: false },
    { name: 'Travel', icon: '✈️', color: '#8b5cf6', order: 9, isDefault: true, isArchived: false },
    { name: 'Subscriptions', icon: '📱', color: '#a855f7', order: 10, isDefault: true, isArchived: false },
    { name: 'Personal Care', icon: '💅', color: '#d946ef', order: 11, isDefault: true, isArchived: false },
    { name: 'Gifts', icon: '🎁', color: '#ec4899', order: 12, isDefault: true, isArchived: false },
    { name: 'Other', icon: '📦', color: '#6b7280', order: 13, isDefault: true, isArchived: false },
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
    { name: 'Salary', icon: '💼', color: '#22c55e', order: 0, isDefault: true, isArchived: false },
    { name: 'Freelance', icon: '💻', color: '#3b82f6', order: 1, isDefault: true, isArchived: false },
    { name: 'Business', icon: '🏢', color: '#8b5cf6', order: 2, isDefault: true, isArchived: false },
    { name: 'Gifts', icon: '🎁', color: '#ec4899', order: 3, isDefault: true, isArchived: false },
    { name: 'Allowance', icon: '🪙', color: '#f97316', order: 4, isDefault: true, isArchived: false },
    { name: 'Investment', icon: '📈', color: '#14b8a6', order: 5, isDefault: true, isArchived: false },
    { name: 'Other', icon: '📦', color: '#6b7280', order: 6, isDefault: true, isArchived: false },
  ];

  await db.incomeCategories.bulkPut(
    defaultIncomeCategories.map((cat, i) => ({
      ...cat,
      id: `cat-inc-${i}`,
      createdAt: now,
      updatedAt: now,
    }))
  );

  // Default payment methods with real emoji icons
  const defaultPaymentMethods: Omit<PaymentMethod, 'id' | 'createdAt' | 'updatedAt'>[] = [
    { name: 'Cash', icon: '💵', color: '#22c55e', isDefault: true, isArchived: false, order: 0 },
    { name: 'UPI', icon: '📱', color: '#6366f1', isDefault: true, isArchived: false, order: 1 },
    { name: 'GPay', icon: '📱', color: '#3b82f6', isDefault: true, isArchived: false, order: 2 },
    { name: 'Credit Card', icon: '💳', color: '#ef4444', isDefault: true, isArchived: false, order: 3 },
    { name: 'Debit Card', icon: '💳', color: '#f97316', isDefault: true, isArchived: false, order: 4 },
    { name: 'Bank Transfer', icon: '🏦', color: '#14b8a6', isDefault: true, isArchived: false, order: 5 },
    { name: 'Other', icon: '💳', color: '#6b7280', isDefault: true, isArchived: false, order: 6 },
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
