import { DataTypes } from "sequelize";

export default (sequelize) => {
  const Debt = sequelize.define(
    "Debt",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      walletId: { type: DataTypes.INTEGER, allowNull: true },

      // owed_by_me = minh no nguoi khac; owed_to_me = nguoi khac no minh
      type: {
        type: DataTypes.ENUM("owed_by_me", "owed_to_me"),
        allowNull: false,
      },
      personName: { type: DataTypes.STRING(150), allowNull: false },
      personPhone: { type: DataTypes.STRING(20), allowNull: true },

      amount: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
      paidAmount: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
      // amount - paidAmount = con lai (tinh trong service)

      borrowedDate: { type: DataTypes.DATEONLY, allowNull: false },
      dueDate: { type: DataTypes.DATEONLY, allowNull: true },
      interestRate: { type: DataTypes.DECIMAL(5, 2), allowNull: true, defaultValue: 0 },
      interestType: {
        type: DataTypes.ENUM("none", "simple", "compound"),
        defaultValue: "none",
      },

      status: {
        type: DataTypes.ENUM("active", "paid", "overdue"),
        defaultValue: "active",
      },
      note: { type: DataTypes.STRING(500), allowNull: true },
      lastDueNotifiedDate: { type: DataTypes.DATEONLY, allowNull: true },
    },
    {
      tableName: "debts",
      timestamps: true,
      paranoid: true,
      indexes: [
        { fields: ["userId"] },
        { fields: ["userId", "status"] },
        { fields: ["userId", "status", "dueDate"] },
        { fields: ["dueDate"] },
      ],
    }
  );

  return Debt;
};
