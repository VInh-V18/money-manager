import { NavLink } from "react-router";
import { Bot, BarChart3, Home, ListOrdered, Settings, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { to: "/", icon: Home, label: "Tổng quan", end: true },
  { to: "/transactions", icon: ListOrdered, label: "Giao dịch" },
  { to: "/ai", icon: Bot, label: "AI" },
  { to: "/reports", icon: BarChart3, label: "Báo cáo" },
  { to: "/settings", icon: Settings, label: "Cài đặt" },
];

export function MobileBottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex h-12 flex-col items-center justify-center gap-1 rounded-md text-[11px] font-medium transition",
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                )
              }
            >
              <Icon className="size-4" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
