import { DataTypes } from "sequelize";

export default (sequelize) => {
  const ExpenseTemplate = sequelize.define(
    "ExpenseTemplate",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      walletId: { type: DataTypes.INTEGER, allowNull: true },
      categoryId: { type: DataTypes.INTEGER, allowNull: true },

      name: { type: DataTypes.STRING(100), allowNull: false },
      defaultAmount: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
      // income hoac expense (chu yeu expense)
      type: {
        type: DataTypes.ENUM("income", "expense"),
        defaultValue: "expense",
      },
      icon: { type: DataTypes.STRING(50), defaultValue: "zap" },
      color: { type: DataTypes.STRING(20), defaultValue: "#F59E0B" },
      defaultNote: { type: DataTypes.STRING(255), allowNull: true },
      // de pin len dashboard
      isPinned: { type: DataTypes.BOOLEAN, defaultValue: false },
      sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
      // dem so lan dung -> sort theo do thuong dung
      usageCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    },
    {
      tableName: "expense_templates",
      timestamps: true,
      paranoid: true,
      indexes: [{ fields: ["userId"] }],
    }
  );

  return ExpenseTemplate;
};
