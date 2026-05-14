import { NavLink } from "react-router";
import {
  LayoutDashboard,
  Wallet,
  ListOrdered,
  FolderTree,
  PiggyBank,
  Repeat,
  Target,
  Users,
  Zap,
  BarChart3,
  Bell,
  Settings,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", icon: LayoutDashboard, label: "Tổng quan", end: true },
  { to: "/transactions", icon: ListOrdered, label: "Giao dịch" },
  { to: "/wallets", icon: Wallet, label: "Ví tiền" },
  { to: "/categories", icon: FolderTree, label: "Danh mục" },
  { to: "/budgets", icon: PiggyBank, label: "Ngân sách" },
  { to: "/fixed-expenses", icon: Repeat, label: "Chi cố định" },
  { to: "/goals", icon: Target, label: "Mục tiêu" },
  { to: "/debts", icon: Users, label: "Nợ" },
  { to: "/templates", icon: Zap, label: "Mẫu chi nhanh" },
  { to: "/reports", icon: BarChart3, label: "Báo cáo" },
  { to: "/notifications", icon: Bell, label: "Thông báo" },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-600 text-white shadow-md">
            <TrendingUp className="size-5" />
          </div>
          <div className="font-bold text-base">
            Money <span className="text-primary">Manager</span>
          </div>
        </div>

        <nav className="overflow-y-auto custom-scroll p-3 h-[calc(100vh-4rem)]">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/60"
                      )
                    }
                  >
                    <Icon className="size-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 pt-6 border-t border-sidebar-border">
            <NavLink
              to="/settings"
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60"
                )
              }
            >
              <Settings className="size-4" />
              Cài đặt
            </NavLink>
          </div>
        </nav>
      </aside>
    </>
  );
}
