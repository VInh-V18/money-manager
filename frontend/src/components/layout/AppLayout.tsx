import { useState } from "react";
import { Outlet, useLocation } from "react-router";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileBottomNav } from "./MobileBottomNav";
import { FloatingAiChatbot } from "@/components/ai/FloatingAiChatbot";

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="min-w-0 overflow-x-hidden lg:pl-64">
        <Header onToggleSidebar={() => setSidebarOpen(true)} />
        <main className="mx-auto w-full min-w-0 max-w-7xl px-3 pt-20 pb-24 sm:px-4 lg:px-6 lg:pb-24">
          <Outlet />
        </main>
      </div>
      <MobileBottomNav />
      {pathname !== "/ai" && <FloatingAiChatbot />}
    </div>
  );
}
