import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import path from "path";

import env from "./config/env.js";
import { connectDB } from "./config/database.js";
import { syncModels } from "./models/index.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorMiddleware.js";

// routes
import authRoute from "./routes/authRoute.js";
import walletRoute from "./routes/walletRoute.js";
import categoryRoute from "./routes/categoryRoute.js";
import transactionRoute from "./routes/transactionRoute.js";
import reportRoute from "./routes/reportRoute.js";
import {
  budgetRouter,
  fixedRouter,
  goalRouter,
  debtRouter,
  templateRouter,
  notifRouter,
} from "./routes/moduleRoutes.js";

// cron
import { initCronJobs } from "./jobs/cronJobs.js";

const app = express();

// ===== Bao mat & middleware co ban =====
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/uploads", express.static(path.resolve(env.UPLOAD_DIR)));

// ===== Health =====
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    data: { status: "ok", uptime: process.uptime(), env: env.NODE_ENV },
  });
});

// ===== Routes =====
app.use("/api/auth", authRoute);
app.use("/api/wallets", walletRoute);
app.use("/api/categories", categoryRoute);
app.use("/api/transactions", transactionRoute);
app.use("/api/budgets", budgetRouter);
app.use("/api/fixed-expenses", fixedRouter);
app.use("/api/goals", goalRouter);
app.use("/api/debts", debtRouter);
app.use("/api/templates", templateRouter);
app.use("/api/notifications", notifRouter);
app.use("/api/reports", reportRoute);

app.get("/api", (req, res) => {
  res.json({
    success: true,
    message: "Money Manager API - Day du module",
    endpoints: {
      auth: "/api/auth/*",
      wallets: "/api/wallets/*",
      categories: "/api/categories/*",
      transactions: "/api/transactions/*",
      budgets: "/api/budgets/*",
      fixedExpenses: "/api/fixed-expenses/*",
      goals: "/api/goals/*",
      debts: "/api/debts/*",
      templates: "/api/templates/*",
      notifications: "/api/notifications/*",
      reports: "/api/reports/*",
    },
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

const start = async () => {
  await connectDB();
  await syncModels({ alter: true });
  initCronJobs();
  app.listen(env.PORT, () => {
    console.log(`\n✓ Server chay tai http://localhost:${env.PORT}`);
    console.log(`  Health check: http://localhost:${env.PORT}/api/health`);
    console.log(`  API root: http://localhost:${env.PORT}/api\n`);
  });
};

start().catch((err) => {
  console.error("✗ Khoi dong server that bai:", err);
  process.exit(1);
});

export default app;
