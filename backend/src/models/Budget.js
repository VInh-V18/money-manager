import { DataTypes } from "sequelize";

export default (sequelize) => {
  const Budget = sequelize.define(
    "Budget",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      // null = ngan sach tong (tat ca chi tieu); co gia tri = ngan sach cho 1 danh muc
      categoryId: { type: DataTypes.INTEGER, allowNull: true },

      name: { type: DataTypes.STRING(150), allowNull: false },
      amount: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
      period: {
        type: DataTypes.ENUM("daily", "weekly", "monthly", "yearly", "custom"),
        defaultValue: "monthly",
      },
      startDate: { type: DataTypes.DATEONLY, allowNull: false },
      endDate: { type: DataTypes.DATEONLY, allowNull: true },

      // % canh bao (vd: 80) -> tao thong bao khi vuot %
      warnThreshold: { type: DataTypes.INTEGER, defaultValue: 80 },
      // co cho phep vuot ngan sach hay khong
      strictMode: { type: DataTypes.BOOLEAN, defaultValue: false },

      isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
      rolloverEnabled: { type: DataTypes.BOOLEAN, defaultValue: false },
      rolloverAmount: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
      note: { type: DataTypes.STRING(500), allowNull: true },
    },
    {
      tableName: "budgets",
      timestamps: true,
      paranoid: true,
      indexes: [
        { fields: ["userId"] },
        { fields: ["userId", "isActive"] },
        { fields: ["userId", "isActive", "categoryId"] },
        { fields: ["isActive", "rolloverEnabled"] },
        { fields: ["categoryId"] },
      ],
    }
  );

  return Budget;
};
