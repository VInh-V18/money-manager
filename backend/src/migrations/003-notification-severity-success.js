import { DataTypes } from "sequelize";

export const up = async ({ context: qi }) => {
  await qi.changeColumn("notifications", "severity", {
    type: DataTypes.ENUM("info", "warning", "danger", "success"),
    defaultValue: "info",
    allowNull: true,
  });
};

export const down = async ({ context: qi }) => {
  await qi.changeColumn("notifications", "severity", {
    type: DataTypes.ENUM("info", "warning", "danger"),
    defaultValue: "info",
    allowNull: true,
  });
};
