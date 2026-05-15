import { DataTypes } from "sequelize";

export const NOTIFICATION_TYPES = [
  "budget_warning",
  "budget_exceeded",
  "low_balance",
  "fixed_expense_due",
  "fixed_expense_generated",
  "abnormal_spending",
  "goal_progress",
  "debt_due",
  "remind_log",
  "system",
];

export const defaultTypePreferences = () =>
  NOTIFICATION_TYPES.reduce((acc, type) => {
    acc[type] = true;
    return acc;
  }, {});

export default (sequelize) => {
  const NotificationPreference = sequelize.define(
    "NotificationPreference",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      inAppEnabled: { type: DataTypes.BOOLEAN, defaultValue: true },
      emailEnabled: { type: DataTypes.BOOLEAN, defaultValue: false },
      typePreferences: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: defaultTypePreferences(),
      },
    },
    {
      tableName: "notification_preferences",
      timestamps: true,
      indexes: [{ unique: true, fields: ["userId"] }],
    }
  );

  return NotificationPreference;
};
