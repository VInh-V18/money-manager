import { DataTypes } from "sequelize";

export default (sequelize) => {
  const LoginHistory = sequelize.define(
    "LoginHistory",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: true },
      email: { type: DataTypes.STRING(150), allowNull: true },
      status: {
        type: DataTypes.ENUM(
          "SUCCESS",
          "FAILED_PASSWORD",
          "FAILED_USER",
          "LOCKED",
          "OAUTH_SUCCESS",
          "OAUTH_FAILED"
        ),
        allowNull: false,
      },
      reason: { type: DataTypes.STRING(255), allowNull: true },
      ipAddress: { type: DataTypes.STRING(45), allowNull: true },
      userAgent: { type: DataTypes.STRING(500), allowNull: true },
      deviceName: { type: DataTypes.STRING(120), allowNull: true },
      browser: { type: DataTypes.STRING(80), allowNull: true },
      os: { type: DataTypes.STRING(80), allowNull: true },
    },
    {
      tableName: "login_history",
      timestamps: true,
      updatedAt: false,
      indexes: [
        { fields: ["userId"] },
        { fields: ["email"] },
        { fields: ["status"] },
        { fields: ["createdAt"] },
      ],
    }
  );

  return LoginHistory;
};
