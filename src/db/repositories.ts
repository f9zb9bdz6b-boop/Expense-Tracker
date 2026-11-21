// ============================================================
// Database Repository Functions
// ============================================================
import { db } from './database';
import { generateId } from '@/utils/helpers';
import { DEFAULT_CURRENCY } from '@/utils/currency';
import type {
  Expense, Income, ExpenseCategory, IncomeCategory,
  PaymentMethod, Budget, SpecialEvent, RecurringTransaction,
  FinancialGoal, SavingsContribution, SavingsChallenge,
  Receipt, ExpenseSplit, SplitParticipant, Merchant,
  PriceRecord, Notification, UserSettings, TransactionFilters,
} from '@/types';

// --- Expense Repository ---
export const expenseRepo = {
  async create(data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Promise<Expense> {
    const now = Date.now();
    const expense: Expense = { ...data, id: generateId(), createdAt: now, updatedAt: now };
    await db.expenses.put(expense);
    return expense;
  },

  async update(id: string, data: Partial<Expense>): Promise<void> {
    await db.expenses.update(id, { ...data, updatedAt: Date.now() });
  },

  async delete(id: string): Promise<void> {
    await db.expenses.delete(id);
  },

  async getById(id: string): Promise<Expense | undefined> {
    return db.expenses.get(id);
  },

  async getAll(): Promise<Expense[]> {
    return db.expenses.orderBy('date').reverse().toArray();
  },

  async getByDateRange(from: string, to: string): Promise<Expense[]> {
    return db.expenses
      .where('date')
      .between(from, to, true, true)
      .reverse()
      .toArray();
  },

  async getByCategory(categoryId: string): Promise<Expense[]> {
    return db.expenses.where('categoryId').equals(categoryId).toArray();
  },

  async getByEvent(eventId: string): Promise<Expense[]> {
    return db.expenses.where('eventId').equals(eventId).toArray();
  },

  async getByMerchant(merchant: string): Promise<Expense[]> {
    return db.expenses.where('merchant').equalsIgnoreCase(merchant).toArray();
  },

  async getFiltered(filters: TransactionFilters): Promise<Expense[]> {
    let collection = db.expenses.orderBy('date').reverse();
    let results = await collection.toArray();

    if (filters.dateFrom) {
      results = results.filter(e => e.date >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      results = results.filter(e => e.date <= filters.dateTo!);
    }
    if (filters.amountMin !== undefined) {
      results = results.filter(e => e.amount >= filters.amountMin!);
    }
    if (filters.amountMax !== undefined) {
      results = results.filter(e => e.amount <= filters.amountMax!);
    }
    if (filters.categoryIds?.length) {
      results = results.filter(e => filters.categoryIds!.includes(e.categoryId));
    }
    if (filters.paymentMethodIds?.length) {
      results = results.filter(e => filters.paymentMethodIds!.includes(e.paymentMethodId));
    }
    if (filters.classifications?.length) {
      results = results.filter(e => filters.classifications!.includes(e.classification));
    }
    if (filters.eventIds?.length) {
      results = results.filter(e => e.eventId && filters.eventIds!.includes(e.eventId));
    }
    if (filters.merchants?.length) {
      results = results.filter(e =>
        filters.merchants!.some(m => e.merchant.toLowerCase().includes(m.toLowerCase()))
      );
    }
    if (filters.tags?.length) {
      results = results.filter(e =>
        filters.tags!.some(t => e.tags.includes(t))
      );
    }
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      results = results.filter(e =>
        e.description.toLowerCase().includes(q) ||
        e.merchant.toLowerCase().includes(q) ||
        e.notes.toLowerCase().includes(q)
      );
    }

    return results;
  },

  async getTotalByDateRange(from: string, to: string): Promise<number> {
    const expenses = await this.getByDateRange(from, to);
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  },

  async count(): Promise<number> {
    return db.expenses.count();
  },
};

// --- Income Repository ---
export const incomeRepo = {
  async create(data: Omit<Income, 'id' | 'createdAt' | 'updatedAt'>): Promise<Income> {
    const now = Date.now();
    const income: Income = { ...data, id: generateId(), createdAt: now, updatedAt: now };
    await db.income.put(income);
    return income;
  },

  async update(id: string, data: Partial<Income>): Promise<void> {
    await db.income.update(id, { ...data, updatedAt: Date.now() });
  },

  async delete(id: string): Promise<void> {
    await db.income.delete(id);
  },

  async getById(id: string): Promise<Income | undefined> {
    return db.income.get(id);
  },

  async getAll(): Promise<Income[]> {
    return db.income.orderBy('date').reverse().toArray();
  },

  async getByDateRange(from: string, to: string): Promise<Income[]> {
    return db.income
      .where('date')
      .between(from, to, true, true)
      .reverse()
      .toArray();
  },

  async getTotalByDateRange(from: string, to: string): Promise<number> {
    const incomes = await this.getByDateRange(from, to);
    return incomes.reduce((sum, i) => sum + i.amount, 0);
  },

  async count(): Promise<number> {
    return db.income.count();
  },
};

// --- Category Repositories ---
export const expenseCategoryRepo = {
  async getAll(): Promise<ExpenseCategory[]> {
    return db.expenseCategories.orderBy('order').toArray();
  },

  async getActive(): Promise<ExpenseCategory[]> {
    return db.expenseCategories.where('isArchived').equals(0).sortBy('order');
  },

  async getById(id: string): Promise<ExpenseCategory | undefined> {
    return db.expenseCategories.get(id);
  },

  async create(data: Omit<ExpenseCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<ExpenseCategory> {
    const now = Date.now();
    const cat: ExpenseCategory = { ...data, id: generateId(), createdAt: now, updatedAt: now };
    await db.expenseCategories.put(cat);
    return cat;
  },

  async update(id: string, data: Partial<ExpenseCategory>): Promise<void> {
    await db.expenseCategories.update(id, { ...data, updatedAt: Date.now() });
  },

  async archive(id: string): Promise<void> {
    await db.expenseCategories.update(id, { isArchived: true, updatedAt: Date.now() });
  },

  async delete(id: string): Promise<void> {
    // Check if category has expenses
    const count = await db.expenses.where('categoryId').equals(id).count();
    if (count > 0) {
      throw new Error(`Cannot delete category: ${count} expenses use this category. Archive it instead.`);
    }
    await db.expenseCategories.delete(id);
  },
};

export const incomeCategoryRepo = {
  async getAll(): Promise<IncomeCategory[]> {
    return db.incomeCategories.orderBy('order').toArray();
  },

  async getActive(): Promise<IncomeCategory[]> {
    return db.incomeCategories.where('isArchived').equals(0).sortBy('order');
  },

  async getById(id: string): Promise<IncomeCategory | undefined> {
    return db.incomeCategories.get(id);
  },

  async create(data: Omit<IncomeCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<IncomeCategory> {
    const now = Date.now();
    const cat: IncomeCategory = { ...data, id: generateId(), createdAt: now, updatedAt: now };
    await db.incomeCategories.put(cat);
    return cat;
  },

  async update(id: string, data: Partial<IncomeCategory>): Promise<void> {
    await db.incomeCategories.update(id, { ...data, updatedAt: Date.now() });
  },

  async delete(id: string): Promise<void> {
    const count = await db.income.where('categoryId').equals(id).count();
    if (count > 0) {
      throw new Error(`Cannot delete category: ${count} income records use this category.`);
    }
    await db.incomeCategories.delete(id);
  },
};

// --- Payment Method Repository ---
export const paymentMethodRepo = {
  async getAll(): Promise<PaymentMethod[]> {
    return db.paymentMethods.orderBy('order').toArray();
  },

  async getActive(): Promise<PaymentMethod[]> {
    return db.paymentMethods.where('isArchived').equals(0).sortBy('order');
  },

  async getById(id: string): Promise<PaymentMethod | undefined> {
    return db.paymentMethods.get(id);
  },

  async create(data: Omit<PaymentMethod, 'id' | 'createdAt' | 'updatedAt'>): Promise<PaymentMethod> {
    const now = Date.now();
    const pm: PaymentMethod = { ...data, id: generateId(), createdAt: now, updatedAt: now };
    await db.paymentMethods.put(pm);
    return pm;
  },

  async update(id: string, data: Partial<PaymentMethod>): Promise<void> {
    await db.paymentMethods.update(id, { ...data, updatedAt: Date.now() });
  },

  async delete(id: string): Promise<void> {
    const count = await db.expenses.where('paymentMethodId').equals(id).count();
    if (count > 0) {
      throw new Error(`Cannot delete payment method: ${count} expenses use it.`);
    }
    await db.paymentMethods.delete(id);
  },
};

// --- Budget Repository ---
export const budgetRepo = {
  async getAll(): Promise<Budget[]> {
    return db.budgets.toArray();
  },

  async getActive(): Promise<Budget[]> {
    return db.budgets.where('isActive').equals(1).toArray();
  },

  async getById(id: string): Promise<Budget | undefined> {
    return db.budgets.get(id);
  },

  async create(data: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>): Promise<Budget> {
    const now = Date.now();
    const budget: Budget = { ...data, id: generateId(), createdAt: now, updatedAt: now };
    await db.budgets.put(budget);
    return budget;
  },

  async update(id: string, data: Partial<Budget>): Promise<void> {
    await db.budgets.update(id, { ...data, updatedAt: Date.now() });
  },

  async delete(id: string): Promise<void> {
    await db.budgets.delete(id);
  },
};

// --- Event Repository ---
export const eventRepo = {
  async getAll(): Promise<SpecialEvent[]> {
    return db.events.orderBy('startDate').reverse().toArray();
  },

  async getActive(): Promise<SpecialEvent[]> {
    return db.events.where('status').anyOf('planned', 'active').toArray();
  },

  async getById(id: string): Promise<SpecialEvent | undefined> {
    return db.events.get(id);
  },

  async create(data: Omit<SpecialEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<SpecialEvent> {
    const now = Date.now();
    const event: SpecialEvent = { ...data, id: generateId(), createdAt: now, updatedAt: now };
    await db.events.put(event);
    return event;
  },

  async update(id: string, data: Partial<SpecialEvent>): Promise<void> {
    await db.events.update(id, { ...data, updatedAt: Date.now() });
  },

  async delete(id: string): Promise<void> {
    await db.events.delete(id);
  },

  async getEventExpenses(eventId: string): Promise<Expense[]> {
    return db.expenses.where('eventId').equals(eventId).toArray();
  },

  async getEventTotal(eventId: string): Promise<number> {
    const expenses = await this.getEventExpenses(eventId);
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  },
};

// --- Recurring Transaction Repository ---
export const recurringRepo = {
  async getAll(): Promise<RecurringTransaction[]> {
    return db.recurringTransactions.toArray();
  },

  async getActive(): Promise<RecurringTransaction[]> {
    return db.recurringTransactions.where('isActive').equals(1).toArray();
  },

  async getDue(): Promise<RecurringTransaction[]> {
    const today = new Date().toISOString().split('T')[0];
    return db.recurringTransactions
      .where('nextDueDate')
      .belowOrEqual(today)
      .and(r => r.isActive)
      .toArray();
  },

  async getById(id: string): Promise<RecurringTransaction | undefined> {
    return db.recurringTransactions.get(id);
  },

  async create(data: Omit<RecurringTransaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<RecurringTransaction> {
    const now = Date.now();
    const rec: RecurringTransaction = { ...data, id: generateId(), createdAt: now, updatedAt: now };
    await db.recurringTransactions.put(rec);
    return rec;
  },

  async update(id: string, data: Partial<RecurringTransaction>): Promise<void> {
    await db.recurringTransactions.update(id, { ...data, updatedAt: Date.now() });
  },

  async delete(id: string): Promise<void> {
    await db.recurringTransactions.delete(id);
  },
};

// --- Financial Goals Repository ---
export const goalRepo = {
  async getAll(): Promise<FinancialGoal[]> {
    return db.financialGoals.toArray();
  },

  async getActive(): Promise<FinancialGoal[]> {
    return db.financialGoals.where('status').equals('active').toArray();
  },

  async getById(id: string): Promise<FinancialGoal | undefined> {
    return db.financialGoals.get(id);
  },

  async create(data: Omit<FinancialGoal, 'id' | 'createdAt' | 'updatedAt'>): Promise<FinancialGoal> {
    const now = Date.now();
    const goal: FinancialGoal = { ...data, id: generateId(), createdAt: now, updatedAt: now };
    await db.financialGoals.put(goal);
    return goal;
  },

  async update(id: string, data: Partial<FinancialGoal>): Promise<void> {
    await db.financialGoals.update(id, { ...data, updatedAt: Date.now() });
  },

  async delete(id: string): Promise<void> {
    await db.financialGoals.delete(id);
  },

  async addContribution(
    goalId: string,
    amount: number,
    options?: {
      source?: string;
      notes?: string;
      deductFromSavings?: boolean;
      date?: string;
    }
  ): Promise<void> {
    const goal = await this.getById(goalId);
    if (!goal) throw new Error('Goal not found');

    const now = Date.now();
    const date = options?.date || new Date().toISOString().split('T')[0];
    const source = options?.source || 'Current Savings';
    const notes = options?.notes || '';
    const deductFromSavings = options?.deductFromSavings !== false;

    await db.savingsContributions.put({
      id: generateId(),
      goalId,
      amount,
      date,
      source,
      type: 'contribution',
      deductFromSavings,
      notes,
      createdAt: now,
      updatedAt: now,
    });

    // If deducted from normal savings/balance, record as an expense in transactions
    if (deductFromSavings) {
      const categories = await db.expenseCategories.toArray();
      const defaultCat = categories.find(c => c.name.toLowerCase().includes('savings') || c.name.toLowerCase().includes('other')) || categories[0];
      const pms = await db.paymentMethods.toArray();
      await db.expenses.put({
        id: generateId(),
        amount,
        currency: goal.currency || 'INR',
        categoryId: defaultCat?.id || 'cat-exp-0',
        paymentMethodId: pms[0]?.id || 'pm-0',
        date,
        time: '12:00',
        description: `[Goal Contribution] ${goal.name}`,
        merchant: `Savings: ${goal.name}`,
        classification: 'necessary',
        tags: ['goal-savings', goalId],
        notes: `Allocated to goal "${goal.name}". Source: ${source}${notes ? ` • ${notes}` : ''}`,
        isRecurring: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    const newAmount = goal.currentAmount + amount;
    const status = newAmount >= goal.targetAmount ? 'completed' : goal.status;
    await this.update(goalId, { currentAmount: newAmount, status });
  },

  async withdrawContribution(
    goalId: string,
    amount: number,
    options?: {
      reason?: string;
      returnToSavings?: boolean;
      date?: string;
    }
  ): Promise<void> {
    const goal = await this.getById(goalId);
    if (!goal) throw new Error('Goal not found');
    if (amount > goal.currentAmount) throw new Error('Withdrawal amount exceeds current goal savings');

    const now = Date.now();
    const date = options?.date || new Date().toISOString().split('T')[0];
    const reason = options?.reason || 'Reclaimed from Goal';
    const returnToSavings = options?.returnToSavings !== false;

    await db.savingsContributions.put({
      id: generateId(),
      goalId,
      amount: -amount,
      date,
      source: reason,
      type: 'withdrawal',
      deductFromSavings: false,
      notes: reason,
      createdAt: now,
      updatedAt: now,
    });

    // If returning funds to normal savings/balance, record as income in transactions
    if (returnToSavings) {
      const incCats = await db.incomeCategories.toArray();
      await db.income.put({
        id: generateId(),
        amount,
        currency: goal.currency || 'INR',
        categoryId: incCats[0]?.id || 'cat-inc-0',
        date,
        time: '12:00',
        description: `[Goal Withdrawal] Reclaimed from ${goal.name}`,
        source: `Goal: ${goal.name}`,
        notes: `Funds released from "${goal.name}". Reason: ${reason}`,
        isRecurring: false,
        tags: ['goal-withdrawal', goalId],
        createdAt: now,
        updatedAt: now,
      });
    }

    const newAmount = Math.max(0, goal.currentAmount - amount);
    const status = (goal.status === 'completed' && newAmount < goal.targetAmount) ? 'active' : goal.status;
    await this.update(goalId, { currentAmount: newAmount, status });
  },

  async getContributions(goalId: string): Promise<SavingsContribution[]> {
    return db.savingsContributions.where('goalId').equals(goalId).toArray();
  },
};

// --- Settings Repository ---
export const settingsRepo = {
  async get(): Promise<UserSettings> {
    const settings = await db.settings.get('user-settings');
    if (!settings) {
      throw new Error('Settings not found. Database may not be initialized.');
    }
    return settings;
  },

  async update(data: Partial<UserSettings>): Promise<void> {
    const existing = await db.settings.get('user-settings');
    if (!existing) {
      await db.settings.put({
        id: 'user-settings',
        currency: DEFAULT_CURRENCY,
        dateFormat: 'dd/MM/yyyy',
        timeFormat: '12h',
        theme: 'system',
        defaultClassification: 'necessary',
        budgetAlertThresholds: [50, 75, 90, 100],
        showDecimal: true,
        weekStartsOn: 1,
        enableNotifications: true,
        enableBrowserNotifications: false,
        hasCompletedOnboarding: true,
        backupReminder: true,
        backupReminderDays: 7,
        ...data,
        updatedAt: Date.now(),
        createdAt: Date.now(),
      } as any);
    } else {
      await db.settings.update('user-settings', { ...data, updatedAt: Date.now() });
    }
  },
};

// --- Receipt Repository ---
export const receiptRepo = {
  async create(data: Omit<Receipt, 'id' | 'createdAt' | 'updatedAt'>): Promise<Receipt> {
    const now = Date.now();
    const receipt: Receipt = { ...data, id: generateId(), createdAt: now, updatedAt: now };
    await db.receipts.put(receipt);
    return receipt;
  },

  async getById(id: string): Promise<Receipt | undefined> {
    return db.receipts.get(id);
  },

  async getByExpense(expenseId: string): Promise<Receipt | undefined> {
    return db.receipts.where('expenseId').equals(expenseId).first();
  },

  async update(id: string, data: Partial<Receipt>): Promise<void> {
    await db.receipts.update(id, { ...data, updatedAt: Date.now() });
  },

  async delete(id: string): Promise<void> {
    await db.receipts.delete(id);
  },
};

// --- Notification Repository ---
export const notificationRepo = {
  async getAll(): Promise<Notification[]> {
    return db.notifications.orderBy('createdAt').reverse().toArray();
  },

  async getUnread(): Promise<Notification[]> {
    return db.notifications.where('isRead').equals(0).reverse().sortBy('createdAt');
  },

  async create(data: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>): Promise<Notification> {
    const now = Date.now();
    const notif: Notification = { ...data, id: generateId(), createdAt: now, updatedAt: now };
    await db.notifications.put(notif);
    return notif;
  },

  async markRead(id: string): Promise<void> {
    await db.notifications.update(id, { isRead: true, updatedAt: Date.now() });
  },

  async markAllRead(): Promise<void> {
    await db.notifications.where('isRead').equals(0).modify({ isRead: true, updatedAt: Date.now() });
  },

  async delete(id: string): Promise<void> {
    await db.notifications.delete(id);
  },

  async deleteAll(): Promise<void> {
    await db.notifications.clear();
  },
};

// --- Merchant Repository ---
export const merchantRepo = {
  async getAll(): Promise<Merchant[]> {
    return db.merchants.toArray();
  },

  async getByName(name: string): Promise<Merchant | undefined> {
    return db.merchants.where('name').equalsIgnoreCase(name).first();
  },

  async upsert(name: string, amount: number, categoryId?: string): Promise<void> {
    if (!name.trim()) return;
    const existing = await this.getByName(name);
    const now = Date.now();
    if (existing) {
      await db.merchants.update(existing.id, {
        totalSpent: existing.totalSpent + amount,
        transactionCount: existing.transactionCount + 1,
        lastVisitDate: new Date().toISOString().split('T')[0],
        updatedAt: now,
      });
    } else {
      await db.merchants.put({
        id: generateId(),
        name: name.trim(),
        category: categoryId,
        totalSpent: amount,
        transactionCount: 1,
        lastVisitDate: new Date().toISOString().split('T')[0],
        notes: '',
        createdAt: now,
        updatedAt: now,
      });
    }
  },
};

// --- Expense Split Repository ---
export const splitRepo = {
  async create(data: Omit<ExpenseSplit, 'id' | 'createdAt' | 'updatedAt'>): Promise<ExpenseSplit> {
    const now = Date.now();
    const split: ExpenseSplit = { ...data, id: generateId(), createdAt: now, updatedAt: now };
    await db.expenseSplits.put(split);
    return split;
  },

  async getByExpense(expenseId: string): Promise<ExpenseSplit | undefined> {
    return db.expenseSplits.where('expenseId').equals(expenseId).first();
  },

  async addParticipant(data: Omit<SplitParticipant, 'id' | 'createdAt' | 'updatedAt'>): Promise<SplitParticipant> {
    const now = Date.now();
    const participant: SplitParticipant = { ...data, id: generateId(), createdAt: now, updatedAt: now };
    await db.splitParticipants.put(participant);
    return participant;
  },

  async getParticipants(splitId: string): Promise<SplitParticipant[]> {
    return db.splitParticipants.where('splitId').equals(splitId).toArray();
  },

  async settleParticipant(id: string): Promise<void> {
    await db.splitParticipants.update(id, { isSettled: true, updatedAt: Date.now() });
  },
};

// --- Savings Challenge Repository ---
export const challengeRepo = {
  async getAll(): Promise<SavingsChallenge[]> {
    return db.savingsChallenges.toArray();
  },

  async getActive(): Promise<SavingsChallenge[]> {
    return db.savingsChallenges.where('status').equals('active').toArray();
  },

  async create(data: Omit<SavingsChallenge, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavingsChallenge> {
    const now = Date.now();
    const ch: SavingsChallenge = { ...data, id: generateId(), createdAt: now, updatedAt: now };
    await db.savingsChallenges.put(ch);
    return ch;
  },

  async update(id: string, data: Partial<SavingsChallenge>): Promise<void> {
    await db.savingsChallenges.update(id, { ...data, updatedAt: Date.now() });
  },

  async delete(id: string): Promise<void> {
    await db.savingsChallenges.delete(id);
  },
};

// --- Price Record Repository ---
export const priceRecordRepo = {
  async getAll(): Promise<PriceRecord[]> {
    return db.priceRecords.orderBy('date').reverse().toArray();
  },

  async getByItem(itemName: string): Promise<PriceRecord[]> {
    return db.priceRecords.where('itemName').equalsIgnoreCase(itemName).toArray();
  },

  async create(data: Omit<PriceRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<PriceRecord> {
    const now = Date.now();
    const pr: PriceRecord = { ...data, id: generateId(), createdAt: now, updatedAt: now };
    await db.priceRecords.put(pr);
    return pr;
  },

  async delete(id: string): Promise<void> {
    await db.priceRecords.delete(id);
  },
};

// --- Backup & Restore ---
export const backupRepo = {
  async exportAll(): Promise<string> {
    const [
      expenses, income, expenseCategories, incomeCategories,
      paymentMethods, budgets, events, recurringTransactions,
      financialGoals, savingsContributions, savingsChallenges,
      receipts, expenseSplits, splitParticipants, merchants,
      priceRecords, notifications, settings,
    ] = await Promise.all([
      db.expenses.toArray(),
      db.income.toArray(),
      db.expenseCategories.toArray(),
      db.incomeCategories.toArray(),
      db.paymentMethods.toArray(),
      db.budgets.toArray(),
      db.events.toArray(),
      db.recurringTransactions.toArray(),
      db.financialGoals.toArray(),
      db.savingsContributions.toArray(),
      db.savingsChallenges.toArray(),
      // Strip image data from receipts to keep backup manageable
      db.receipts.toArray().then(recs =>
        recs.map(({ imageData: _img, thumbnailData: _thumb, ...rest }) => rest)
      ),
      db.expenseSplits.toArray(),
      db.splitParticipants.toArray(),
      db.merchants.toArray(),
      db.priceRecords.toArray(),
      db.notifications.toArray(),
      settingsRepo.get(),
    ]);

    const backup = {
      version: '1.0.0',
      schemaVersion: 1,
      exportDate: new Date().toISOString(),
      appName: 'ExpenseTracker',
      data: {
        expenses, income, expenseCategories, incomeCategories,
        paymentMethods, budgets, events, recurringTransactions,
        financialGoals, savingsContributions, savingsChallenges,
        receipts, expenseSplits, splitParticipants, merchants,
        priceRecords, notifications, settings,
      },
    };

    return JSON.stringify(backup, null, 2);
  },

  async restore(jsonStr: string, mode: 'replace' | 'merge' = 'replace'): Promise<{ success: boolean; message: string }> {
    try {
      const backup = JSON.parse(jsonStr);

      // Validate
      if (!backup.appName || backup.appName !== 'ExpenseTracker') {
        return { success: false, message: 'Invalid backup file: not an ExpenseTracker backup.' };
      }
      if (!backup.data) {
        return { success: false, message: 'Invalid backup file: no data found.' };
      }

      if (mode === 'replace') {
        // Clear all tables
        await Promise.all([
          db.expenses.clear(),
          db.income.clear(),
          db.expenseCategories.clear(),
          db.incomeCategories.clear(),
          db.paymentMethods.clear(),
          db.budgets.clear(),
          db.events.clear(),
          db.recurringTransactions.clear(),
          db.financialGoals.clear(),
          db.savingsContributions.clear(),
          db.savingsChallenges.clear(),
          db.receipts.clear(),
          db.expenseSplits.clear(),
          db.splitParticipants.clear(),
          db.merchants.clear(),
          db.priceRecords.clear(),
          db.notifications.clear(),
          db.settings.clear(),
        ]);
      }

      const d = backup.data;
      await Promise.all([
        d.expenses?.length && db.expenses.bulkPut(d.expenses),
        d.income?.length && db.income.bulkPut(d.income),
        d.expenseCategories?.length && db.expenseCategories.bulkPut(d.expenseCategories),
        d.incomeCategories?.length && db.incomeCategories.bulkPut(d.incomeCategories),
        d.paymentMethods?.length && db.paymentMethods.bulkPut(d.paymentMethods),
        d.budgets?.length && db.budgets.bulkPut(d.budgets),
        d.events?.length && db.events.bulkPut(d.events),
        d.recurringTransactions?.length && db.recurringTransactions.bulkPut(d.recurringTransactions),
        d.financialGoals?.length && db.financialGoals.bulkPut(d.financialGoals),
        d.savingsContributions?.length && db.savingsContributions.bulkPut(d.savingsContributions),
        d.savingsChallenges?.length && db.savingsChallenges.bulkPut(d.savingsChallenges),
        d.expenseSplits?.length && db.expenseSplits.bulkPut(d.expenseSplits),
        d.splitParticipants?.length && db.splitParticipants.bulkPut(d.splitParticipants),
        d.merchants?.length && db.merchants.bulkPut(d.merchants),
        d.priceRecords?.length && db.priceRecords.bulkPut(d.priceRecords),
        d.notifications?.length && db.notifications.bulkPut(d.notifications),
        d.settings && db.settings.put(d.settings),
      ]);

      return { success: true, message: `Data restored successfully from backup dated ${backup.exportDate}.` };
    } catch (error) {
      return { success: false, message: `Restore failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  },
};
