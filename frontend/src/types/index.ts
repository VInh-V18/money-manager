// ===== Common =====
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: Array<{ field: string; message: string }>;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: Pagination;
}

// ===== User / Auth =====
export interface User {
  id: number;
  username: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  phone: string | null;
  isVerified: boolean;
  role: "USER" | "ADMIN" | "SUPER_ADMIN" | "PREMIUM_USER" | "SUPPORT" | "AUDITOR";
  defaultCurrency: string;
  timezone: string;
  createdAt: string;
}

export interface AuthSession {
  id: number;
  deviceName: string | null;
  browser: string | null;
  os: string | null;
  ipAddress: string | null;
  lastActiveAt: string | null;
  expiresAt: string;
  createdAt: string;
  isCurrent: boolean;
}

export interface LoginHistory {
  id: number;
  userId: number | null;
  email: string | null;
  status: "SUCCESS" | "FAILED_PASSWORD" | "FAILED_USER" | "LOCKED" | "OAUTH_SUCCESS" | "OAUTH_FAILED";
  reason: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  deviceName: string | null;
  browser: string | null;
  os: string | null;
  createdAt: string;
}

export interface ActivityLog {
  id: number;
  userId: number;
  action: string;
  entityType: string;
  entityId: number | null;
  payload: unknown;
  ipAddress: string | null;
  createdAt: string;
}

export interface Feedback {
  id: number;
  userId: number;
  type: "feedback" | "bug" | "feature_request";
  title: string;
  message: string;
  status: "open" | "reviewing" | "resolved" | "closed";
  createdAt: string;
}

// ===== Wallet =====
export type WalletType =
  | "cash"
  | "bank"
  | "ewallet"
  | "saving"
  | "investment"
  | "other";

export interface Wallet {
  id: number;
  userId: number;
  name: string;
  type: WalletType;
  balance: string | number;
  initialBalance: string | number;
  currency: string;
  color: string;
  icon: string;
  note: string | null;
  isActive: boolean;
  excludeFromTotal: boolean;
  createdAt: string;
}

export interface WalletWithTransactions extends Wallet {
  Transactions?: Transaction[];
}

export interface WalletBalanceHistory {
  id: number;
  userId: number;
  walletId: number;
  beforeBalance: string | number;
  amountChanged: string | number;
  afterBalance: string | number;
  reason: string;
  referenceType: string | null;
  referenceId: number | null;
  createdAt: string;
}

// ===== Category =====
export type CategoryType = "income" | "expense";

export interface Category {
  id: number;
  userId: number;
  parentId: number | null;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  monthlyBudget: string | number | null;
  isSystem: boolean;
  sortOrder: number;
  children?: Category[];
}

// ===== Transaction =====
export type TransactionSubType =
  | "regular"
  | "daily_wage"
  | "hourly_wage"
  | "bonus"
  | "freelance"
  | "salary"
  | "gift"
  | "refund"
  | "fixed"
  | "transfer_fee"
  | "other";

export interface Transaction {
  id: number;
  userId: number;
  walletId: number;
  categoryId: number | null;
  type: CategoryType;
  subType: TransactionSubType;
  amount: string | number;
  description: string | null;
  note: string | null;
  transactionDate: string;
  transactionTime: string | null;
  receiptUrl: string | null;
  fixedExpenseId: number | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  Wallet?: Wallet;
  Category?: Category;
}

// ===== Budget =====
export type BudgetPeriod = "daily" | "weekly" | "monthly" | "yearly" | "custom";

export interface Budget {
  id: number;
  userId: number;
  categoryId: number | null;
  name: string;
  amount: string | number;
  period: BudgetPeriod;
  startDate: string;
  endDate: string | null;
  warnThreshold: number;
  strictMode: boolean;
  isActive: boolean;
  // tinh boi backend
  spent?: number;
  limit?: number;
  remaining?: number;
  usedPercent?: number;
  isExceeded?: boolean;
  isWarning?: boolean;
  periodFrom?: string;
  periodTo?: string;
  Category?: Category;
}

export interface BudgetSummary {
  totalLimit: number;
  totalSpent: number;
  totalRemaining: number;
  count: number;
  exceeded: number;
  warning: number;
  items: Budget[];
}

// ===== FixedExpense =====
export interface FixedExpense {
  id: number;
  userId: number;
  walletId: number;
  categoryId: number | null;
  name: string;
  amount: string | number;
  frequency: BudgetPeriod;
  customIntervalDays: number | null;
  dayOfMonth: number | null;
  dayOfWeek: number | null;
  startDate: string;
  endDate: string | null;
  nextDueDate: string;
  lastGeneratedDate: string | null;
  autoDeduct: boolean;
  remindDaysBefore: number;
  isActive: boolean;
  note: string | null;
  Wallet?: Wallet;
  Category?: Category;
}

// ===== Goal =====
export interface Goal {
  id: number;
  userId: number;
  walletId: number | null;
  name: string;
  targetAmount: string | number;
  currentAmount: string | number;
  targetDate: string | null;
  startDate: string;
  icon: string;
  color: string;
  status: "active" | "completed" | "cancelled";
  progress?: number;
  remaining?: number;
  daysLeft?: number | null;
  suggestedDaily?: number | null;
}

// ===== Debt =====
export interface Debt {
  id: number;
  userId: number;
  walletId: number | null;
  type: "owed_by_me" | "owed_to_me";
  personName: string;
  personPhone: string | null;
  amount: string | number;
  paidAmount: string | number;
  borrowedDate: string;
  dueDate: string | null;
  status: "active" | "paid" | "overdue";
  note: string | null;
  remaining?: number;
}

// ===== Template =====
export interface ExpenseTemplate {
  id: number;
  userId: number;
  walletId: number | null;
  categoryId: number | null;
  name: string;
  defaultAmount: string | number | null;
  type: CategoryType;
  icon: string;
  color: string;
  defaultNote: string | null;
  isPinned: boolean;
  sortOrder: number;
  usageCount: number;
  Wallet?: Wallet;
  Category?: Category;
}

// ===== Notification =====
export type NotificationType =
  | "budget_warning"
  | "budget_exceeded"
  | "low_balance"
  | "fixed_expense_due"
  | "fixed_expense_generated"
  | "abnormal_spending"
  | "goal_progress"
  | "debt_due"
  | "remind_log"
  | "system";

export interface Notification {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  severity: "info" | "warning" | "danger";
  relatedEntity: { entityType: string; entityId: number } | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

// ===== Report =====
export interface OverviewData {
  totalBalance: number;
  todayIncome: number;
  todayExpense: number;
  monthIncome: number;
  monthExpense: number;
  monthNet: number;
  savingRate: number;
  daysLeftInMonth: number;
  suggestedDailySpend: number;
  recentTransactions: Transaction[];
}

export interface RangeReport {
  range: { from: string; to: string };
  summary: {
    income: number;
    expense: number;
    net: number;
    incomeCount: number;
    expenseCount: number;
    savingRate: number;
  };
  byCategory: Array<{
    categoryId: number;
    type: CategoryType;
    total: number;
    count: number;
    category: Category;
  }>;
  topTransactions: Transaction[];
}

export interface DailyStat {
  date: string;
  income: number;
  expense: number;
}
