import { DataTypes } from "sequelize";

export default (sequelize) => {
  const Notification = sequelize.define(
    "Notification",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },

      type: {
        type: DataTypes.ENUM(
          "budget_warning",
          "budget_exceeded",
          "low_balance",
          "fixed_expense_due",
          "fixed_expense_generated",
          "abnormal_spending",
          "goal_progress",
          "debt_due",
          "remind_log",
          "system"
        ),
        allowNull: false,
      },
      title: { type: DataTypes.STRING(255), allowNull: false },
      message: { type: DataTypes.TEXT, allowNull: false },
      // muc do: info | warning | danger | success
      severity: {
        type: DataTypes.ENUM("info", "warning", "danger", "success"),
        defaultValue: "info",
      },
      // de deeplink ve trang nao: vd { entityType: 'budget', entityId: 12 }
      relatedEntity: { type: DataTypes.JSON, allowNull: true },
      isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
      readAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: "notifications",
      timestamps: true,
      indexes: [
        { fields: ["userId"] },
        { fields: ["userId", "isRead"] },
        { fields: ["userId", "isRead", "createdAt"] },
        { fields: ["userId", "createdAt"] },
        { fields: ["createdAt"] },
      ],
    }
  );

  return Notification;
};
