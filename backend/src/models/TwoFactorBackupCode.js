import { DataTypes } from "sequelize";

export default (sequelize) => {
  const TwoFactorBackupCode = sequelize.define(
    "TwoFactorBackupCode",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      codeHash: { type: DataTypes.STRING(255), allowNull: false },
      usedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: "two_factor_backup_codes",
      timestamps: true,
      updatedAt: false,
      indexes: [{ fields: ["userId"] }],
    }
  );

  return TwoFactorBackupCode;
};
