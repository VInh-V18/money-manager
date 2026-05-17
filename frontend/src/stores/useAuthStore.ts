import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { toast } from "sonner";
import { authService } from "@/services/authService";
import { getErrorMessage } from "@/lib/axios";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import type { User } from "@/types";

interface AuthState {
  accessToken: string | null;
  user: User | null;
  loading: boolean;
  initialized: boolean;

  setAccessToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  clearState: () => void;

  signUp: (data: { username: string; email: string; password: string; displayName: string }) => Promise<boolean>;
  signIn: (identifier: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  fetchMe: () => Promise<void>;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,
      loading: false,
      initialized: false,

      setAccessToken: (accessToken) => set({ accessToken }),
      setUser: (user) => set({ user }),
      clearState: () => set({ accessToken: null, user: null }),

      signUp: async (data) => {
        try {
          set({ loading: true });
          await authService.signUp(data);
          toast.success("Đăng ký thành công! Bạn có thể đăng nhập ngay.");
          return true;
        } catch (error) {
          toast.error(getErrorMessage(error, "Đăng ký không thành công"));
          return false;
        } finally {
          set({ loading: false });
        }
      },

      signIn: async (identifier, password) => {
        try {
          set({ loading: true });
          const { user, accessToken } = await authService.signIn(identifier, password);
          set({ user, accessToken });
          connectSocket(accessToken);
          toast.success(`Chào ${user.displayName}`);
          return true;
        } catch (error) {
          toast.error(getErrorMessage(error, "Đăng nhập không thành công"));
          return false;
        } finally {
          set({ loading: false });
        }
      },

      signOut: async () => {
        try {
          await authService.signOut();
        } catch {
          // ignore
        }
        disconnectSocket();
        get().clearState();
        toast.success("Đã đăng xuất");
      },

      fetchMe: async () => {
        try {
          const user = await authService.fetchMe();
          set({ user });
        } catch {
          set({ user: null, accessToken: null });
        }
      },

      initAuth: async () => {
        const { accessToken } = get();
        if (accessToken) {
          await get().fetchMe();
          const { accessToken: token } = get();
          if (token) connectSocket(token);
        }
        set({ initialized: true });
      },
    }),
    {
      name: "money-manager-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ accessToken: state.accessToken }),
    }
  )
);

