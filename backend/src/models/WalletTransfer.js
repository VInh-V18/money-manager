import { DataTypes } from "sequelize";

export default (sequelize) => {
  const WalletTransfer = sequelize.define(
    "WalletTransfer",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      fromWalletId: { type: DataTypes.INTEGER, allowNull: false },
      toWalletId: { type: DataTypes.INTEGER, allowNull: false },

      amount: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
      // phi neu co (vd: chuyen lien ngan hang)
      fee: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
      transferDate: { type: DataTypes.DATEONLY, allowNull: false },
      note: { type: DataTypes.STRING(500), allowNull: true },
    },
    {
      tableName: "wallet_transfers",
      timestamps: true,
      paranoid: true,
      indexes: [
        { fields: ["userId"] },
        { fields: ["fromWalletId"] },
        { fields: ["toWalletId"] },
      ],
    }
  );

  return WalletTransfer;
};
