import { DataTypes } from "sequelize";

export default (sequelize) => {
  const Otp = sequelize.define(
    "Otp",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      // verify_email | reset_password
      purpose: {
        type: DataTypes.ENUM("verify_email", "reset_password"),
        allowNull: false,
      },
      code: { type: DataTypes.STRING(128), allowNull: false },
      expiresAt: { type: DataTypes.DATE, allowNull: false },
      used: { type: DataTypes.BOOLEAN, defaultValue: false },
    },
    {
      tableName: "otps",
      timestamps: true,
      indexes: [{ fields: ["userId", "purpose"] }],
    }
  );

  return Otp;
};
