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
import aiRoute from "./routes/aiRoute.js";
import feedbackRoute from "./routes/feedbackRoute.js";
import { openApiDocument } from "./docs/openapi.js";
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
app.set("trust proxy", 1);

const allowedOrigins = new Set([
  ...env.CLIENT_URLS,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

// ===== Bao mat & middleware co ban =====
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
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
app.get("/api/docs/openapi.json", (req, res) => {
  res.json(openApiDocument);
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
app.use("/api/ai", aiRoute);
app.use("/api/feedback", feedbackRoute);

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
      ai: "/api/ai/*",
      feedback: "/api/feedback/*",
      docs: "/api/docs/openapi.json",
    },
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

const start = async () => {
  await connectDB();
  await syncModels({
    alter: env.NODE_ENV === "development" && env.DB_SYNC_ALTER !== "false",
    force: env.DB_SYNC_FORCE === "true",
  });
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
