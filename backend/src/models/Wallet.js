import { DataTypes } from "sequelize";

export default (sequelize) => {
  const Wallet = sequelize.define(
    "Wallet",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING(100), allowNull: false },
      type: {
        type: DataTypes.ENUM(
          "cash",
          "bank",
          "ewallet",
          "saving",
          "investment",
          "other"
        ),
        defaultValue: "cash",
        allowNull: false,
      },
      // so du hien tai (cap nhat real-time khi co giao dich)
      balance: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
      },
      initialBalance: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
      },
      currency: { type: DataTypes.STRING(10), defaultValue: "VND" },
      color: { type: DataTypes.STRING(20), defaultValue: "#3B82F6" },
      icon: { type: DataTypes.STRING(50), defaultValue: "wallet" },
      note: { type: DataTypes.STRING(500), allowNull: true },
      isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
      // de loai khoi tong so du nhung khong xoa
      excludeFromTotal: { type: DataTypes.BOOLEAN, defaultValue: false },
    },
    {
      tableName: "wallets",
      timestamps: true,
      paranoid: true, // soft delete -> tao deletedAt
      indexes: [{ fields: ["userId"] }, { fields: ["userId", "isActive"] }],
    }
  );

  return Wallet;
};
