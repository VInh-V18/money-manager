import { DataTypes } from "sequelize";

export default (sequelize) => {
  const FixedExpense = sequelize.define(
    "FixedExpense",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      walletId: { type: DataTypes.INTEGER, allowNull: false },
      categoryId: { type: DataTypes.INTEGER, allowNull: true },

      name: { type: DataTypes.STRING(150), allowNull: false },
      amount: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
      // chu ky: hang ngay/tuan/thang/nam/tuy chinh
      frequency: {
        type: DataTypes.ENUM("daily", "weekly", "monthly", "yearly", "custom"),
        defaultValue: "monthly",
      },
      // neu custom: so ngay giua moi lan
      customIntervalDays: { type: DataTypes.INTEGER, allowNull: true },
      // ngay trong thang (cho monthly), 0-6 (cho weekly), 1-31 (monthly), 1-365 (yearly)
      dayOfMonth: { type: DataTypes.INTEGER, allowNull: true },
      dayOfWeek: { type: DataTypes.INTEGER, allowNull: true },

      startDate: { type: DataTypes.DATEONLY, allowNull: false },
      endDate: { type: DataTypes.DATEONLY, allowNull: true },
      // ngay sap toi can tao giao dich -> cron job dung field nay
      nextDueDate: { type: DataTypes.DATEONLY, allowNull: false },
      lastGeneratedDate: { type: DataTypes.DATEONLY, allowNull: true },

      autoDeduct: { type: DataTypes.BOOLEAN, defaultValue: true },
      remindDaysBefore: { type: DataTypes.INTEGER, defaultValue: 1 },
      isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
      note: { type: DataTypes.STRING(500), allowNull: true },
    },
    {
      tableName: "fixed_expenses",
      timestamps: true,
      paranoid: true,
      indexes: [
        { fields: ["userId"] },
        { fields: ["userId", "isActive"] },
        { fields: ["userId", "isActive", "nextDueDate"] },
        { fields: ["nextDueDate"] },
      ],
    }
  );

  return FixedExpense;
};
