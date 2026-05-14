import { DataTypes } from "sequelize";

export default (sequelize) => {
  const Transaction = sequelize.define(
    "Transaction",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      walletId: { type: DataTypes.INTEGER, allowNull: false },
      categoryId: { type: DataTypes.INTEGER, allowNull: true },

      type: {
        type: DataTypes.ENUM("income", "expense"),
        allowNull: false,
      },
      // sub-type cho phep mo rong: bat ky, theo ngay, theo gio, co dinh, freelancer ...
      // -> giup tinh nang "thu nhap theo gio/ngay" trong prompt
      subType: {
        type: DataTypes.ENUM(
          "regular",
          "daily_wage",
          "hourly_wage",
          "bonus",
          "freelance",
          "salary",
          "gift",
          "refund",
          "fixed",
          "transfer_fee",
          "other"
        ),
        defaultValue: "regular",
      },
      amount: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
      description: { type: DataTypes.STRING(255), allowNull: true },
      note: { type: DataTypes.STRING(1000), allowNull: true },
      transactionDate: { type: DataTypes.DATEONLY, allowNull: false },
      transactionTime: { type: DataTypes.TIME, allowNull: true },
      receiptUrl: { type: DataTypes.TEXT, allowNull: true },
      // de track giao dich tao tu chi co dinh -> de undo neu can
      fixedExpenseId: { type: DataTypes.INTEGER, allowNull: true },
      // metadata phu cho thu nhap theo gio/ngay
      // vd: { hourlyRate: 50000, hours: 4, shift: "sang" }
      metadata: { type: DataTypes.JSON, allowNull: true },
    },
    {
      tableName: "transactions",
      timestamps: true,
      paranoid: true,
      indexes: [
        { fields: ["userId"] },
        { fields: ["userId", "transactionDate"] },
        { fields: ["userId", "transactionDate", "createdAt"] },
        { fields: ["userId", "type", "transactionDate"] },
        { fields: ["userId", "walletId", "transactionDate"] },
        { fields: ["userId", "categoryId", "transactionDate"] },
        { fields: ["userId", "amount"] },
        { fields: ["walletId"] },
        { fields: ["categoryId"] },
        { fields: ["type"] },
      ],
    }
  );

  return Transaction;
};
