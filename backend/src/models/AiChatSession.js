import { DataTypes } from "sequelize";

export default (sequelize) => {
  const AiChatSession = sequelize.define(
    "AiChatSession",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      title: { type: DataTypes.STRING(255), allowNull: true },
    },
    {
      tableName: "ai_chat_sessions",
      timestamps: true,
      indexes: [{ fields: ["userId"] }],
    }
  );

  return AiChatSession;
};
