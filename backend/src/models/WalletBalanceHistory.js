import { DataTypes } from "sequelize";

export default (sequelize) => {
  const WalletBalanceHistory = sequelize.define(
    "WalletBalanceHistory",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      walletId: { type: DataTypes.INTEGER, allowNull: false },
      beforeBalance: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
      amountChanged: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
      afterBalance: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
      reason: { type: DataTypes.STRING(100), allowNull: false },
      referenceType: { type: DataTypes.STRING(50), allowNull: true },
      referenceId: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: "wallet_balance_histories",
      timestamps: true,
      updatedAt: false,
      indexes: [
        { fields: ["userId", "createdAt"] },
        { fields: ["walletId", "createdAt"] },
        { fields: ["referenceType", "referenceId"] },
      ],
    }
  );

  return WalletBalanceHistory;
};
