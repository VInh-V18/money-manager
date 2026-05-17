import { DataTypes } from "sequelize";

const ensureColumn = async (qi, tableName, columnName, definition) => {
  let table;
  try {
    table = await qi.describeTable(tableName);
  } catch {
    return;
  }
  if (!table[columnName]) {
    await qi.addColumn(tableName, columnName, definition);
  }
};

export const up = async ({ context: qi }) => {
  await ensureColumn(qi, "users", "role", {
    type: DataTypes.ENUM("USER", "ADMIN", "SUPER_ADMIN", "PREMIUM_USER", "SUPPORT", "AUDITOR"),
    allowNull: false,
    defaultValue: "USER",
  });
  await ensureColumn(qi, "users", "failedLoginCount", {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  });
  await ensureColumn(qi, "users", "lockedUntil", {
    type: DataTypes.DATE,
    allowNull: true,
  });
  await ensureColumn(qi, "users", "passwordChangedAt", {
    type: DataTypes.DATE,
    allowNull: true,
  });
  await ensureColumn(qi, "users", "twoFactorEnabled", {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });
  await ensureColumn(qi, "users", "twoFactorSecret", {
    type: DataTypes.STRING(255),
    allowNull: true,
  });
  await ensureColumn(qi, "transactions", "idempotencyKey", {
    type: DataTypes.STRING(100),
    allowNull: true,
  });
  await ensureColumn(qi, "transactions", "checksum", {
    type: DataTypes.STRING(64),
    allowNull: true,
  });
  await ensureColumn(qi, "wallets", "lowBalanceThreshold", {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: true,
  });
  await ensureColumn(qi, "wallets", "lowBalanceLastNotifiedAt", {
    type: DataTypes.DATEONLY,
    allowNull: true,
  });
  await ensureColumn(qi, "wallets", "creditLimit", {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: true,
  });
  await ensureColumn(qi, "wallets", "statementDay", {
    type: DataTypes.INTEGER,
    allowNull: true,
  });
  await ensureColumn(qi, "wallets", "paymentDueDay", {
    type: DataTypes.INTEGER,
    allowNull: true,
  });
  await ensureColumn(qi, "debts", "lastDueNotifiedDate", {
    type: DataTypes.DATEONLY,
    allowNull: true,
  });
  await ensureColumn(qi, "debts", "interestRate", {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 0,
  });
  await ensureColumn(qi, "debts", "interestType", {
    type: DataTypes.ENUM("none", "simple", "compound"),
    allowNull: false,
    defaultValue: "none",
  });
  await ensureColumn(qi, "budgets", "rolloverEnabled", {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });
  await ensureColumn(qi, "budgets", "rolloverAmount", {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false,
    defaultValue: 0,
  });
  await ensureColumn(qi, "financial_goals", "priority", {
    type: DataTypes.ENUM("low", "medium", "high"),
    allowNull: false,
    defaultValue: "medium",
  });
  await ensureColumn(qi, "notification_preferences", "remindLogEnabled", {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  });
  await ensureColumn(qi, "notification_preferences", "remindLogTime", {
    type: DataTypes.STRING(5),
    allowNull: false,
    defaultValue: "20:00",
  });
  await ensureColumn(qi, "notification_preferences", "lastRemindLogDate", {
    type: DataTypes.DATEONLY,
    allowNull: true,
  });
  await ensureColumn(qi, "refresh_tokens", "deviceName", {
    type: DataTypes.STRING(120),
    allowNull: true,
  });
  await ensureColumn(qi, "refresh_tokens", "browser", {
    type: DataTypes.STRING(80),
    allowNull: true,
  });
  await ensureColumn(qi, "refresh_tokens", "os", {
    type: DataTypes.STRING(80),
    allowNull: true,
  });
  await ensureColumn(qi, "refresh_tokens", "lastActiveAt", {
    type: DataTypes.DATE,
    allowNull: true,
  });
};

export const down = async () => {
  // Intentionally empty — removing columns from production is destructive
};
