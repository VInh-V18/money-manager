import path from "path";
import fs from "fs";

import env from "./config/env.js";
import { logger } from "./utils/logger.js";
import { connectDB } from "./config/database.js";
import { syncModels } from "./models/index.js";
import { initSocket } from "./utils/socket.js";
import { initCronJobs } from "./jobs/cronJobs.js";
import { createApp, createHttpServer } from "./app.js";

const logsDir = path.resolve("logs");
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const app = createApp();
const httpServer = createHttpServer(app);

const start = async () => {
  await connectDB();
  await syncModels({
    alter: env.DB_SYNC_ALTER === "true",
    force: env.DB_SYNC_FORCE === "true",
  });
  initSocket(httpServer);
  initCronJobs();
  httpServer.listen(env.PORT, () => {
    logger.info(`Server chạy tại http://localhost:${env.PORT}`);
    logger.info(`Health check: http://localhost:${env.PORT}/api/health`);
  });
};

start().catch((err) => {
  logger.error("Khởi động server thất bại:", err);
  process.exit(1);
});

export default app;
