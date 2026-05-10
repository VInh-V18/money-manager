import { DataTypes } from "sequelize";

export default (sequelize) => {
  const Category = sequelize.define(
    "Category",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      // danh muc cha (null = root)
      parentId: { type: DataTypes.INTEGER, allowNull: true },
      name: { type: DataTypes.STRING(100), allowNull: false },
      type: {
        type: DataTypes.ENUM("income", "expense"),
        allowNull: false,
      },
      icon: { type: DataTypes.STRING(50), defaultValue: "folder" },
      color: { type: DataTypes.STRING(20), defaultValue: "#6B7280" },
      // ngan sach mac dinh moi thang cho danh muc nay
      monthlyBudget: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: true,
      },
      note: { type: DataTypes.STRING(500), allowNull: true },
      // danh muc he thong tao san, user khong duoc xoa
      isSystem: { type: DataTypes.BOOLEAN, defaultValue: false },
      sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
    },
    {
      tableName: "categories",
      timestamps: true,
      paranoid: true,
      indexes: [
        { fields: ["userId"] },
        { fields: ["userId", "type"] },
        { fields: ["parentId"] },
      ],
    }
  );

  return Category;
};
