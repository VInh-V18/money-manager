import { useState } from "react";
import { Outlet } from "react-router";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { FloatingAiChatbot } from "@/components/ai/FloatingAiChatbot";

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="min-w-0 lg:pl-64">
        <Header onToggleSidebar={() => setSidebarOpen(true)} />
        <main className="mx-auto w-full min-w-0 max-w-7xl px-3 py-4 pb-24 sm:px-4 lg:p-6 lg:pb-24">
          <Outlet />
        </main>
      </div>
      <FloatingAiChatbot />
    </div>
  );
}
