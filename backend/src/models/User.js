import { DataTypes } from "sequelize";

export default (sequelize) => {
  const User = sequelize.define(
    "User",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      username: { type: DataTypes.STRING(100), allowNull: false, unique: "uniq_users_username" },
      email: { type: DataTypes.STRING(255), allowNull: false, unique: "uniq_users_email" },
      hashedPassword: { type: DataTypes.STRING(255), allowNull: false },
      displayName: { type: DataTypes.STRING(255), allowNull: false },
      avatarUrl: { type: DataTypes.TEXT, allowNull: true },
      avatarId: { type: DataTypes.STRING(255), allowNull: true },
      bio: { type: DataTypes.STRING(500), allowNull: true },
      phone: { type: DataTypes.STRING(20), allowNull: true, unique: "uniq_users_phone" },
      isVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
      role: {
        type: DataTypes.ENUM("USER", "ADMIN", "SUPER_ADMIN", "PREMIUM_USER", "SUPPORT", "AUDITOR"),
        allowNull: false,
        defaultValue: "USER",
      },
      failedLoginCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      lockedUntil: { type: DataTypes.DATE, allowNull: true },
      passwordChangedAt: { type: DataTypes.DATE, allowNull: true },
      defaultCurrency: { type: DataTypes.STRING(10), defaultValue: "VND" },
      timezone: { type: DataTypes.STRING(50), defaultValue: "Asia/Ho_Chi_Minh" },
      twoFactorEnabled: { type: DataTypes.BOOLEAN, defaultValue: false },
      twoFactorSecret: { type: DataTypes.STRING(255), allowNull: true },
    },
    {
      tableName: "users",
      timestamps: true,
      indexes: [{ fields: ["role"] }],
    }
  );

  return User;
};
