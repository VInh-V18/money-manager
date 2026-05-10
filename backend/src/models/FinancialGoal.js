import { DataTypes } from "sequelize";

export default (sequelize) => {
  const FinancialGoal = sequelize.define(
    "FinancialGoal",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      // ket noi voi 1 vi tiet kiem (tuy chon)
      walletId: { type: DataTypes.INTEGER, allowNull: true },

      name: { type: DataTypes.STRING(150), allowNull: false },
      targetAmount: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
      currentAmount: {
        type: DataTypes.DECIMAL(18, 2),
        defaultValue: 0,
      },
      targetDate: { type: DataTypes.DATEONLY, allowNull: true },
      startDate: { type: DataTypes.DATEONLY, allowNull: false },

      icon: { type: DataTypes.STRING(50), defaultValue: "target" },
      color: { type: DataTypes.STRING(20), defaultValue: "#A855F7" },
      note: { type: DataTypes.STRING(500), allowNull: true },

      status: {
        type: DataTypes.ENUM("active", "completed", "cancelled"),
        defaultValue: "active",
      },
    },
    {
      tableName: "financial_goals",
      timestamps: true,
      paranoid: true,
      indexes: [{ fields: ["userId"] }, { fields: ["userId", "status"] }],
    }
  );

  return FinancialGoal;
};
