// ============================================================
// Core Types for the Expense Tracker Application
// ============================================================

// --- Base Types ---
export type ID = string;
export type Timestamp = number; // Unix ms

export interface BaseEntity {
  id: ID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// --- Currency ---
export interface CurrencyConfig {
  code: string;        // ISO 4217
  symbol: string;
  name: string;
  decimalPlaces: number;
  symbolPosition: 'before' | 'after';
}

// --- Expense Classification ---
export type ExpenseClassification = 'necessary' | 'discretionary';
export type DetailedClassification = 'needs' | 'wants' | 'savings';

// --- Transaction Type ---
export type TransactionType = 'expense' | 'income';

// --- Expense ---
export interface Expense extends BaseEntity {
  amount: number;          // Stored in minor units (paise for INR) for precision
  currency: string;        // ISO 4217 code
  categoryId: ID;
  date: string;            // YYYY-MM-DD
  time: string;            // HH:mm
  description: string;
  paymentMethodId: ID;
  merchant: string;
  classification: ExpenseClassification;
  detailedClassification?: DetailedClassification;
  eventId?: ID;            // Special event association
  receiptId?: ID;
  tags: string[];
  isRecurring: boolean;
  recurringId?: ID;
  notes: string;
  originalAmount?: number;     // For foreign currency transactions
  originalCurrency?: string;
  exchangeRate?: number;
}

// --- Income ---
export interface Income extends BaseEntity {
  amount: number;          // Minor units
  currency: string;
  categoryId: ID;
  date: string;
  time: string;
  description: string;
  source: string;
  notes: string;
  isRecurring: boolean;
  recurringId?: ID;
  tags: string[];
}

// --- Categories ---
export interface ExpenseCategory extends BaseEntity {
  name: string;
  icon: string;            // Lucide icon name
  color: string;           // Hex color
  parentId?: ID;           // For subcategories
  order: number;
  isDefault: boolean;
  isArchived: boolean;
  budgetAmount?: number;   // Category-specific budget (minor units)
  budgetPeriod?: BudgetPeriod;
}

export interface IncomeCategory extends BaseEntity {
  name: string;
  icon: string;
  color: string;
  order: number;
  isDefault: boolean;
  isArchived: boolean;
}

// --- Payment Methods ---
export interface PaymentMethod extends BaseEntity {
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
  isArchived: boolean;
  order: number;
}

// --- Budgets ---
export type BudgetPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface Budget extends BaseEntity {
  name: string;
  amount: number;          // Minor units
  period: BudgetPeriod;
  categoryId?: ID;         // If category-specific
  startDate: string;
  endDate?: string;
  isActive: boolean;
  alertThresholds: number[]; // e.g. [50, 75, 90, 100]
  currency: string;
  notes: string;
}

// --- Special Events ---
export type EventStatus = 'planned' | 'active' | 'completed' | 'cancelled';

export interface SpecialEvent extends BaseEntity {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  budget: number;          // Minor units
  currency: string;
  status: EventStatus;
  notes: string;
  color: string;
  icon: string;
}

// --- Recurring Transactions ---
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface RecurringTransaction extends BaseEntity {
  type: TransactionType;
  amount: number;
  currency: string;
  categoryId: ID;
  description: string;
  paymentMethodId?: ID;    // Only for expenses
  merchant?: string;
  classification?: ExpenseClassification;
  frequency: RecurrenceFrequency;
  interval: number;        // Every N days/weeks/months/years
  startDate: string;
  endDate?: string;
  nextDueDate: string;
  lastGeneratedDate?: string;
  isActive: boolean;
  notes: string;
  tags: string[];
}

// --- Financial Goals ---
export type GoalStatus = 'active' | 'completed' | 'paused' | 'cancelled';

export interface FinancialGoal extends BaseEntity {
  name: string;
  description: string;
  targetAmount: number;    // Minor units
  currentAmount: number;
  currency: string;
  targetDate?: string;
  status: GoalStatus;
  icon: string;
  color: string;
  notes: string;
}

// --- Savings Contributions ---
export interface SavingsContribution extends BaseEntity {
  goalId: ID;
  amount: number;
  date: string;
  notes: string;
}

// --- Savings Challenges ---
export type ChallengeType = 'weekly' | 'monthly' | 'custom';
export type ChallengeStatus = 'active' | 'completed' | 'paused' | 'cancelled';

export interface SavingsChallenge extends BaseEntity {
  name: string;
  type: ChallengeType;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  startDate: string;
  endDate: string;
  status: ChallengeStatus;
  rules: string;
  notes: string;
}

// --- Receipts ---
export interface Receipt extends BaseEntity {
  expenseId?: ID;
  imageData: string;       // Base64 or blob URL
  thumbnailData?: string;
  mimeType: string;
  fileName: string;
  fileSize: number;
  ocrResult?: OCRResult;
  isProcessed: boolean;
}

export interface OCRResult {
  merchantName?: string;
  totalAmount?: number;
  date?: string;
  time?: string;
  taxAmount?: number;
  items: OCRItem[];
  rawText: string;
  confidence: number;      // 0-100
}

export interface OCRItem {
  name: string;
  quantity?: number;
  price?: number;
}

// --- Expense Splits ---
export interface ExpenseSplit extends BaseEntity {
  expenseId: ID;
  totalAmount: number;
  currency: string;
  description: string;
  isSettled: boolean;
  notes: string;
}

export interface SplitParticipant extends BaseEntity {
  splitId: ID;
  name: string;
  shareAmount: number;
  paidAmount: number;
  isSettled: boolean;
}

// --- Merchants ---
export interface Merchant extends BaseEntity {
  name: string;
  category?: ID;
  totalSpent: number;      // Denormalized for quick access
  transactionCount: number;
  lastVisitDate?: string;
  notes: string;
}

// --- Price Records ---
export interface PriceRecord extends BaseEntity {
  itemName: string;
  price: number;
  currency: string;
  merchant?: string;
  date: string;
  notes: string;
  unit?: string;
  quantity?: number;
}

// --- Notifications ---
export type NotificationType = 'budget_warning' | 'budget_exceeded' | 'goal_milestone'
  | 'recurring_due' | 'unusual_spending' | 'savings_reminder' | 'general';

export interface Notification extends BaseEntity {
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  referenceId?: ID;
  referenceType?: string;
  priority: 'low' | 'medium' | 'high';
}

// --- Settings ---
export interface UserSettings {
  id: string;              // Always 'user-settings'
  currency: CurrencyConfig;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  theme: 'light' | 'dark' | 'system';
  defaultClassification: ExpenseClassification;
  budgetAlertThresholds: number[];
  showDecimal: boolean;
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  enableNotifications: boolean;
  enableBrowserNotifications: boolean;
  aiProvider?: 'local' | 'openai' | 'gemini';
  hasCompletedOnboarding: boolean;
  backupReminder: boolean;
  backupReminderDays: number;
  lastBackupDate?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// --- Dashboard Types ---
export interface DashboardSummary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  currentMonthSpending: number;
  currentMonthIncome: number;
  currentWeekSpending: number;
  todaySpending: number;
  necessaryExpenses: number;
  discretionaryExpenses: number;
  remainingBudget: number;
  topCategories: CategorySpending[];
  recentTransactions: (Expense | Income)[];
  budgetProgress: BudgetProgress[];
  upcomingRecurring: RecurringTransaction[];
  goalProgress: GoalProgress[];
}

export interface CategorySpending {
  categoryId: ID;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

export interface BudgetProgress {
  budgetId: ID;
  budgetName: string;
  budgetAmount: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: 'safe' | 'warning' | 'danger' | 'exceeded';
}

export interface GoalProgress {
  goalId: ID;
  goalName: string;
  targetAmount: number;
  currentAmount: number;
  percentage: number;
  targetDate?: string;
}

// --- Analytics Types ---
export interface SpendingByPeriod {
  period: string;
  amount: number;
  transactionCount: number;
}

export interface SpendingComparison {
  currentPeriod: string;
  previousPeriod: string;
  currentAmount: number;
  previousAmount: number;
  absoluteChange: number;
  percentageChange: number;
  direction: 'increase' | 'decrease' | 'same';
}

export interface SpendingHighlights {
  highestSpendingDay: { date: string; amount: number } | null;
  lowestSpendingDay: { date: string; amount: number } | null;
  highestSpendingWeek: { weekStart: string; amount: number } | null;
  highestSpendingMonth: { month: string; amount: number } | null;
  mostExpensiveCategory: CategorySpending | null;
  mostUsedPaymentMethod: { methodId: ID; name: string; count: number } | null;
  largestExpense: Expense | null;
  averageDailySpending: number;
  averageMonthlySpending: number;
  noSpendDays: number;
  totalTransactions: number;
}

// --- AI Types ---
export interface AIInsight {
  id: ID;
  type: 'observation' | 'recommendation' | 'warning' | 'tip';
  title: string;
  message: string;
  category?: string;
  confidence: number;
  createdAt: Timestamp;
  isActionable: boolean;
  action?: string;
}

export interface AIChatMessage {
  id: ID;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Timestamp;
}

// --- Financial Health ---
export interface FinancialHealthScore {
  overall: number;            // 0-100
  budgetAdherence: number;
  savingsRate: number;
  spendingConsistency: number;
  emergencyFundProgress: number;
  discretionaryControl: number;
  lastCalculated: Timestamp;
}

// --- Backup ---
export interface BackupData {
  version: string;
  schemaVersion: number;
  exportDate: string;
  appName: string;
  data: {
    expenses: Expense[];
    income: Income[];
    expenseCategories: ExpenseCategory[];
    incomeCategories: IncomeCategory[];
    paymentMethods: PaymentMethod[];
    budgets: Budget[];
    events: SpecialEvent[];
    recurringTransactions: RecurringTransaction[];
    financialGoals: FinancialGoal[];
    savingsContributions: SavingsContribution[];
    savingsChallenges: SavingsChallenge[];
    receipts: Omit<Receipt, 'imageData' | 'thumbnailData'>[];
    expenseSplits: ExpenseSplit[];
    splitParticipants: SplitParticipant[];
    merchants: Merchant[];
    priceRecords: PriceRecord[];
    notifications: Notification[];
    settings: UserSettings;
  };
}

// --- Filter/Sort ---
export interface TransactionFilters {
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  categoryIds?: ID[];
  paymentMethodIds?: ID[];
  classifications?: ExpenseClassification[];
  eventIds?: ID[];
  merchants?: string[];
  tags?: string[];
  searchQuery?: string;
  type?: TransactionType;
  isRecurring?: boolean;
}

export type SortField = 'date' | 'amount' | 'category' | 'merchant' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

// --- Form Types ---
export interface ExpenseFormData {
  amount: string;
  categoryId: string;
  date: string;
  time: string;
  description: string;
  paymentMethodId: string;
  merchant: string;
  classification: ExpenseClassification;
  detailedClassification?: DetailedClassification;
  eventId?: string;
  tags: string[];
  notes: string;
}

export interface IncomeFormData {
  amount: string;
  categoryId: string;
  date: string;
  time: string;
  description: string;
  source: string;
  notes: string;
  tags: string[];
}
