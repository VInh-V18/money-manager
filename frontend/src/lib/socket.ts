import { io, type Socket } from "socket.io-client";
import { BACKEND_URL } from "./env";

let socket: Socket | null = null;

export const connectSocket = (accessToken: string) => {
  if (socket?.connected) return socket;

  socket = io(BACKEND_URL || window.location.origin, {
    auth: { token: accessToken },
    transports: ["websocket", "polling"],
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  return socket;
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};

export const getSocket = () => socket;
