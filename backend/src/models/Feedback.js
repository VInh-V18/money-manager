import { DataTypes } from "sequelize";

export default (sequelize) => {
  const Feedback = sequelize.define(
    "Feedback",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      type: {
        type: DataTypes.ENUM("feedback", "bug", "feature_request"),
        allowNull: false,
        defaultValue: "feedback",
      },
      title: { type: DataTypes.STRING(150), allowNull: false },
      message: { type: DataTypes.TEXT, allowNull: false },
      status: {
        type: DataTypes.ENUM("open", "reviewing", "resolved", "closed"),
        allowNull: false,
        defaultValue: "open",
      },
      userAgent: { type: DataTypes.STRING(500), allowNull: true },
      ipAddress: { type: DataTypes.STRING(45), allowNull: true },
    },
    {
      tableName: "feedbacks",
      timestamps: true,
      indexes: [
        { fields: ["userId", "createdAt"] },
        { fields: ["status", "createdAt"] },
        { fields: ["type"] },
      ],
    }
  );

  return Feedback;
};
