import { DataTypes } from "sequelize";

export default (sequelize) => {
  const AiChatMessage = sequelize.define(
    "AiChatMessage",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      sessionId: { type: DataTypes.INTEGER, allowNull: false },
      role: {
        type: DataTypes.ENUM("user", "assistant"),
        allowNull: false,
      },
      content: { type: DataTypes.TEXT("long"), allowNull: false },
    },
    {
      tableName: "ai_chat_messages",
      timestamps: true,
      updatedAt: false,
      indexes: [{ fields: ["sessionId"] }],
    }
  );

  return AiChatMessage;
};
