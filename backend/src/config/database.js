import { Sequelize } from "sequelize";
import env from "./env.js";

const sequelize = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, {
  host: env.DB_HOST,
  port: env.DB_PORT,
  dialect: "mysql",
  logging: false,
  define: {
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
  ...(env.DB_SSL === "true"
    ? { dialectOptions: { ssl: { rejectUnauthorized: false } } }
    : {}),
});

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("✓ Kết nối MySQL thành công");
  } catch (err) {
    console.error("✗ Không kết nối được MySQL:", err.message);
    process.exit(1);
  }
};

export default sequelize;
