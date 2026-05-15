import { DataTypes } from "sequelize";

export default (sequelize) => {
  const User = sequelize.define(
    "User",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      username: { type: DataTypes.STRING(100), allowNull: false, unique: true },
      email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
      hashedPassword: { type: DataTypes.STRING(255), allowNull: false },
      displayName: { type: DataTypes.STRING(255), allowNull: false },
      avatarUrl: { type: DataTypes.TEXT, allowNull: true },
      avatarId: { type: DataTypes.STRING(255), allowNull: true },
      bio: { type: DataTypes.STRING(500), allowNull: true },
      phone: { type: DataTypes.STRING(20), allowNull: true, unique: true },
      isVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
      failedLoginCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      lockedUntil: { type: DataTypes.DATE, allowNull: true },
      passwordChangedAt: { type: DataTypes.DATE, allowNull: true },
      // tien te chinh hien thi tren dashboard
      defaultCurrency: { type: DataTypes.STRING(10), defaultValue: "VND" },
      timezone: { type: DataTypes.STRING(50), defaultValue: "Asia/Ho_Chi_Minh" },
    },
    {
      tableName: "users",
      timestamps: true,
      indexes: [{ fields: ["email"] }, { fields: ["username"] }],
    }
  );

  return User;
};
