import {
  Banknote,
  Bike,
  Book,
  Briefcase,
  Bus,
  Car,
  Circle,
  Clock,
  Coffee,
  CreditCard,
  CupSoda,
  Folder,
  Fuel,
  Gift,
  GraduationCap,
  Heart,
  HeartPulse,
  Home,
  Landmark,
  Laptop,
  Music,
  PiggyBank,
  Pizza,
  Plane,
  Rocket,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Target,
  TrendingUp,
  Users,
  Utensils,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";
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

const ICONS: Record<string, LucideIcon> = {
  banknote: Banknote,
  bike: Bike,
  book: Book,
  briefcase: Briefcase,
  bus: Bus,
  car: Car,
  circle: Circle,
  clock: Clock,
  coffee: Coffee,
  "credit-card": CreditCard,
  "cup-soda": CupSoda,
  folder: Folder,
  fuel: Fuel,
  gift: Gift,
  "graduation-cap": GraduationCap,
  heart: Heart,
  "heart-pulse": HeartPulse,
  home: Home,
  landmark: Landmark,
  laptop: Laptop,
  music: Music,
  "piggy-bank": PiggyBank,
  pizza: Pizza,
  plane: Plane,
  rocket: Rocket,
  "shopping-bag": ShoppingBag,
  "shopping-cart": ShoppingCart,
  smartphone: Smartphone,
  target: Target,
  "trending-up": TrendingUp,
  users: Users,
  utensils: Utensils,
  wallet: Wallet,
  zap: Zap,
};

export function IconBubble({ icon, color, size = "md", className }: Props) {
  const Cmp = ICONS[icon || "circle"] || Circle;
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
