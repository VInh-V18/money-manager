import sequelize from "../config/database.js";
import { runMigrations } from "../utils/migrator.js";

import UserModel from "./User.js";
import RefreshTokenModel from "./RefreshToken.js";
import OtpModel from "./Otp.js";
import WalletModel from "./Wallet.js";
import CategoryModel from "./Category.js";
import TransactionModel from "./Transaction.js";
import FixedExpenseModel from "./FixedExpense.js";
import ExpenseTemplateModel from "./ExpenseTemplate.js";
import BudgetModel from "./Budget.js";
import FinancialGoalModel from "./FinancialGoal.js";
import DebtModel from "./Debt.js";
import WalletTransferModel from "./WalletTransfer.js";
import NotificationModel from "./Notification.js";
import ActivityLogModel from "./ActivityLog.js";
import LoginHistoryModel from "./LoginHistory.js";
import WalletBalanceHistoryModel from "./WalletBalanceHistory.js";
import FeedbackModel from "./Feedback.js";
import NotificationPreferenceModel from "./NotificationPreference.js";
import TwoFactorBackupCodeModel from "./TwoFactorBackupCode.js";
import AiChatSessionModel from "./AiChatSession.js";
import AiChatMessageModel from "./AiChatMessage.js";

// 1. khoi tao tat ca model
const User = UserModel(sequelize);
const RefreshToken = RefreshTokenModel(sequelize);
const Otp = OtpModel(sequelize);
const Wallet = WalletModel(sequelize);
const Category = CategoryModel(sequelize);
const Transaction = TransactionModel(sequelize);
const FixedExpense = FixedExpenseModel(sequelize);
const ExpenseTemplate = ExpenseTemplateModel(sequelize);
const Budget = BudgetModel(sequelize);
const FinancialGoal = FinancialGoalModel(sequelize);
const Debt = DebtModel(sequelize);
const WalletTransfer = WalletTransferModel(sequelize);
const Notification = NotificationModel(sequelize);
const ActivityLog = ActivityLogModel(sequelize);
const LoginHistory = LoginHistoryModel(sequelize);
const WalletBalanceHistory = WalletBalanceHistoryModel(sequelize);
const Feedback = FeedbackModel(sequelize);
const NotificationPreference = NotificationPreferenceModel(sequelize);
const TwoFactorBackupCode = TwoFactorBackupCodeModel(sequelize);
const AiChatSession = AiChatSessionModel(sequelize);
const AiChatMessage = AiChatMessageModel(sequelize);

// 2. dinh nghia quan he

// User -> nhieu thu khac (1-N)
User.hasMany(RefreshToken, { foreignKey: "userId", onDelete: "CASCADE" });
RefreshToken.belongsTo(User, { foreignKey: "userId" });

User.hasMany(Otp, { foreignKey: "userId", onDelete: "CASCADE" });
Otp.belongsTo(User, { foreignKey: "userId" });

User.hasMany(Wallet, { foreignKey: "userId", onDelete: "CASCADE" });
Wallet.belongsTo(User, { foreignKey: "userId" });

User.hasMany(Category, { foreignKey: "userId", onDelete: "CASCADE" });
Category.belongsTo(User, { foreignKey: "userId" });

User.hasMany(Transaction, { foreignKey: "userId", onDelete: "CASCADE" });
Transaction.belongsTo(User, { foreignKey: "userId" });

User.hasMany(FixedExpense, { foreignKey: "userId", onDelete: "CASCADE" });
FixedExpense.belongsTo(User, { foreignKey: "userId" });

User.hasMany(ExpenseTemplate, { foreignKey: "userId", onDelete: "CASCADE" });
ExpenseTemplate.belongsTo(User, { foreignKey: "userId" });

User.hasMany(Budget, { foreignKey: "userId", onDelete: "CASCADE" });
Budget.belongsTo(User, { foreignKey: "userId" });

User.hasMany(FinancialGoal, { foreignKey: "userId", onDelete: "CASCADE" });
FinancialGoal.belongsTo(User, { foreignKey: "userId" });

User.hasMany(Debt, { foreignKey: "userId", onDelete: "CASCADE" });
Debt.belongsTo(User, { foreignKey: "userId" });

User.hasMany(WalletTransfer, { foreignKey: "userId", onDelete: "CASCADE" });
WalletTransfer.belongsTo(User, { foreignKey: "userId" });

User.hasMany(Notification, { foreignKey: "userId", onDelete: "CASCADE" });
Notification.belongsTo(User, { foreignKey: "userId" });

User.hasMany(ActivityLog, { foreignKey: "userId", onDelete: "CASCADE" });
ActivityLog.belongsTo(User, { foreignKey: "userId" });

User.hasMany(LoginHistory, { foreignKey: "userId", onDelete: "SET NULL" });
LoginHistory.belongsTo(User, { foreignKey: "userId" });

User.hasMany(WalletBalanceHistory, { foreignKey: "userId", onDelete: "CASCADE" });
WalletBalanceHistory.belongsTo(User, { foreignKey: "userId" });

User.hasMany(Feedback, { foreignKey: "userId", onDelete: "CASCADE" });
Feedback.belongsTo(User, { foreignKey: "userId" });

User.hasOne(NotificationPreference, { foreignKey: "userId", onDelete: "CASCADE" });
NotificationPreference.belongsTo(User, { foreignKey: "userId" });

User.hasMany(TwoFactorBackupCode, { foreignKey: "userId", onDelete: "CASCADE" });
TwoFactorBackupCode.belongsTo(User, { foreignKey: "userId" });

User.hasMany(AiChatSession, { foreignKey: "userId", onDelete: "CASCADE" });
AiChatSession.belongsTo(User, { foreignKey: "userId" });

AiChatSession.hasMany(AiChatMessage, { foreignKey: "sessionId", onDelete: "CASCADE" });
AiChatMessage.belongsTo(AiChatSession, { foreignKey: "sessionId" });

// Category - cay cha con (self reference)
Category.hasMany(Category, { foreignKey: "parentId", as: "children" });
Category.belongsTo(Category, { foreignKey: "parentId", as: "parent" });
Category.hasMany(Transaction, { foreignKey: "categoryId" });
Transaction.belongsTo(Category, { foreignKey: "categoryId" });
Category.hasMany(FixedExpense, { foreignKey: "categoryId" });
FixedExpense.belongsTo(Category, { foreignKey: "categoryId" });
Category.hasMany(ExpenseTemplate, { foreignKey: "categoryId" });
ExpenseTemplate.belongsTo(Category, { foreignKey: "categoryId" });
Category.hasMany(Budget, { foreignKey: "categoryId" });
Budget.belongsTo(Category, { foreignKey: "categoryId" });

// Wallet -> Transaction, FixedExpense, ExpenseTemplate, Goal
Wallet.hasMany(Transaction, { foreignKey: "walletId" });
Transaction.belongsTo(Wallet, { foreignKey: "walletId" });
Wallet.hasMany(FixedExpense, { foreignKey: "walletId" });
FixedExpense.belongsTo(Wallet, { foreignKey: "walletId" });
Wallet.hasMany(ExpenseTemplate, { foreignKey: "walletId" });
ExpenseTemplate.belongsTo(Wallet, { foreignKey: "walletId" });
Wallet.hasMany(FinancialGoal, { foreignKey: "walletId" });
FinancialGoal.belongsTo(Wallet, { foreignKey: "walletId" });
Wallet.hasMany(Debt, { foreignKey: "walletId" });
Debt.belongsTo(Wallet, { foreignKey: "walletId" });
Wallet.hasMany(WalletBalanceHistory, { foreignKey: "walletId" });
WalletBalanceHistory.belongsTo(Wallet, { foreignKey: "walletId" });

// WalletTransfer 2 vi
Wallet.hasMany(WalletTransfer, { foreignKey: "fromWalletId", as: "outgoingTransfers" });
WalletTransfer.belongsTo(Wallet, { foreignKey: "fromWalletId", as: "fromWallet" });
Wallet.hasMany(WalletTransfer, { foreignKey: "toWalletId", as: "incomingTransfers" });
WalletTransfer.belongsTo(Wallet, { foreignKey: "toWalletId", as: "toWallet" });

// FixedExpense -> Transaction (giao dich tu sinh)
FixedExpense.hasMany(Transaction, { foreignKey: "fixedExpenseId" });
Transaction.belongsTo(FixedExpense, { foreignKey: "fixedExpenseId" });

const ensureIndex = async (tableName, indexName, columns, { unique = false } = {}) => {
  try {
    const uniqueStr = unique ? "UNIQUE " : "";
    const colStr = columns.join(", ");
    await sequelize.query(
      `CREATE ${uniqueStr}INDEX IF NOT EXISTS \`${indexName}\` ON \`${tableName}\` (${colStr})`
    );
  } catch {
    // Index already exists or table not yet created — safe to ignore
  }
};

const ensureIndexes = async () => {
  await Promise.all([
    ensureIndex("budgets",          "idx_budgets_user_active",       ["`userId`", "`isActive`"]),
    ensureIndex("debts",            "idx_debts_user_status_due",     ["`userId`", "`status`", "`dueDate`"]),
    ensureIndex("financial_goals",  "idx_goals_user_status",         ["`userId`", "`status`"]),
    ensureIndex("notifications",    "idx_notifications_user_read",   ["`userId`", "`isRead`"]),
    ensureIndex("ai_chat_sessions", "idx_ai_sessions_user_updated",  ["`userId`", "`updatedAt`"]),
    ensureIndex("transactions",     "idx_tx_user_date_type",         ["`userId`", "`transactionDate`", "`type`"]),
  ]);
};

// 3. ham dong bo bang
export const syncModels = async ({ force = false } = {}) => {
  // Tạo bảng mới nếu chưa có (an toàn, không xóa cột)
  await sequelize.sync({ alter: false, force });
  // Chạy migration để thêm cột mới vào bảng đã có
  await runMigrations();
  await ensureIndexes();
  console.log("✓ Đồng bộ bảng thành công");
};

export {
  sequelize,
  User,
  RefreshToken,
  Otp,
  Wallet,
  Category,
  Transaction,
  FixedExpense,
  ExpenseTemplate,
  Budget,
  FinancialGoal,
  Debt,
  WalletTransfer,
  Notification,
  ActivityLog,
  LoginHistory,
  WalletBalanceHistory,
  Feedback,
  NotificationPreference,
  TwoFactorBackupCode,
  AiChatSession,
  AiChatMessage,
};

export default {
  sequelize,
  User,
  RefreshToken,
  Otp,
  Wallet,
  Category,
  Transaction,
  FixedExpense,
  ExpenseTemplate,
  Budget,
  FinancialGoal,
  Debt,
  WalletTransfer,
  Notification,
  ActivityLog,
  LoginHistory,
  WalletBalanceHistory,
  Feedback,
  NotificationPreference,
  TwoFactorBackupCode,
  AiChatSession,
  AiChatMessage,
};
