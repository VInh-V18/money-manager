import { create } from "zustand";
import { toast } from "sonner";
import { getSocket } from "@/lib/socket";
import api from "@/lib/axios";

interface NotificationPayload {
  id: number;
  type: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "danger" | "success";
  createdAt: string;
}

interface NotificationStore {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  incrementUnread: () => void;
  fetchUnreadCount: () => Promise<void>;
  listenSocket: () => () => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  unreadCount: 0,

  setUnreadCount: (count) => set({ unreadCount: count }),

  incrementUnread: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),

  fetchUnreadCount: async () => {
    try {
      const res = await api.get("/notifications/unread-count");
      set({ unreadCount: res.data?.data?.unreadCount ?? 0 });
    } catch {
      // ignore
    }
  },

  listenSocket: () => {
    const socket = getSocket();
    if (!socket) return () => {};

    const handler = (data: NotificationPayload) => {
      set((s) => ({ unreadCount: s.unreadCount + 1 }));
      const toastFn = data.severity === "danger" ? toast.error
        : data.severity === "warning" ? toast.warning
        : data.severity === "success" ? toast.success
        : toast.info;
      toastFn(data.title, { description: data.message });
    };

    socket.on("notification:new", handler);
    return () => socket.off("notification:new", handler);
  },
}));
