import { Server } from "socket.io";
import { verifyAccessToken } from "./jwt.js";
import env from "../config/env.js";
import { logger } from "./logger.js";

let io = null;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        const allowed = new Set([
          ...env.CLIENT_URLS,
          "http://localhost:5173",
          "http://127.0.0.1:5173",
        ]);
        if (!origin || allowed.has(origin)) return callback(null, true);
        return callback(new Error(`Socket CORS blocked: ${origin}`));
      },
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // JWT auth middleware
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace("Bearer ", "");
    if (!token) return next(new Error("Chưa xác thực socket"));
    try {
      const payload = verifyAccessToken(token);
      socket.userId = payload.id;
      return next();
    } catch {
      return next(new Error("Token không hợp lệ"));
    }
  });

  io.on("connection", (socket) => {
    const room = `user:${socket.userId}`;
    socket.join(room);
    logger.debug(`[Socket] userId=${socket.userId} kết nối (${socket.id})`);

    socket.on("disconnect", (reason) => {
      logger.debug(`[Socket] userId=${socket.userId} ngắt kết nối: ${reason}`);
    });
  });

  logger.info("[Socket] Socket.IO đã khởi động");
  return io;
};

export const getIo = () => io;

export const emitToUser = (userId, event, data) => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
};
