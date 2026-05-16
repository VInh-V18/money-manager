import { DataTypes } from "sequelize";

export default (sequelize) => {
  const RefreshToken = sequelize.define(
    "RefreshToken",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      token: { type: DataTypes.STRING(500), allowNull: false, unique: true },
      // de revoke khi logout het thiet bi
      revoked: { type: DataTypes.BOOLEAN, defaultValue: false },
      revokedAt: { type: DataTypes.DATE, allowNull: true },
      userAgent: { type: DataTypes.STRING(500), allowNull: true },
      ipAddress: { type: DataTypes.STRING(45), allowNull: true },
      deviceName: { type: DataTypes.STRING(120), allowNull: true },
      browser: { type: DataTypes.STRING(80), allowNull: true },
      os: { type: DataTypes.STRING(80), allowNull: true },
      lastActiveAt: { type: DataTypes.DATE, allowNull: true },
      expiresAt: { type: DataTypes.DATE, allowNull: false },
    },
    {
      tableName: "refresh_tokens",
      timestamps: true,
      indexes: [
        { fields: ["userId"] },
        { fields: ["token"] },
        { fields: ["userId", "revoked"] },
      ],
    }
  );

  return RefreshToken;
};
