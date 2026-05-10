import { Sequelize } from "sequelize";
import env from "./env.js";

const sequelize = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, {
  host: env.DB_HOST,
  port: env.DB_PORT,
  dialect: "mysql",
  logging: env.NODE_ENV === "development" ? false : false,
  define: {
    // mac dinh: tat ca model dung snake_case khi sinh column trong CSDL
    underscored: false,
    timestamps: true,
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("✓ Ket noi MySQL thanh cong");
  } catch (err) {
    console.error("✗ Khong ket noi duoc MySQL:", err.message);
    process.exit(1);
  }
};

export default sequelize;
