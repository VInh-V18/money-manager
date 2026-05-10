import { DataTypes } from "sequelize";

export default (sequelize) => {
  const ActivityLog = sequelize.define(
    "ActivityLog",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },

      action: { type: DataTypes.STRING(100), allowNull: false }, // create, update, delete...
      entityType: { type: DataTypes.STRING(50), allowNull: false }, // wallet, transaction...
      entityId: { type: DataTypes.INTEGER, allowNull: true },
      // luu snapshot cu/moi de undo neu can (gioi han)
      payload: { type: DataTypes.JSON, allowNull: true },
      ipAddress: { type: DataTypes.STRING(45), allowNull: true },
    },
    {
      tableName: "activity_logs",
      timestamps: true,
      updatedAt: false, // chi can createdAt
      indexes: [
        { fields: ["userId"] },
        { fields: ["userId", "createdAt"] },
        { fields: ["entityType", "entityId"] },
      ],
    }
  );

  return ActivityLog;
};
