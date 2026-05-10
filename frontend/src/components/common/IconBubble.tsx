import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  icon?: string | null;
  color?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "size-8 [&>svg]:size-4",
  md: "size-10 [&>svg]:size-5",
  lg: "size-12 [&>svg]:size-6",
};

/** Bubble tròn chứa icon từ lucide. Nhận tên kebab-case (như backend lưu). */
export function IconBubble({ icon, color, size = "md", className }: Props) {
  const iconName = (icon || "circle")
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
  const Cmp = ((Icons as unknown as Record<string, LucideIcon>)[iconName] || Icons.Circle) as LucideIcon;
  const bg = color || "#6B7280";

  return (
    <div
      className={cn("flex items-center justify-center rounded-full shrink-0", sizeMap[size], className)}
      style={{ background: `${bg}20`, color: bg }}
    >
      <Cmp />
    </div>
  );
}
