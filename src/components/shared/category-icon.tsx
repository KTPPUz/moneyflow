import {
  BookOpen,
  BriefcaseBusiness,
  Coffee,
  CreditCard,
  HeartPulse,
  Home,
  ShoppingBag,
  Tag,
  Ticket,
  TrainFront,
  Utensils,
  Wallet,
} from "lucide-react";
export const iconOptions = {
  utensils: Utensils,
  coffee: Coffee,
  home: Home,
  train: TrainFront,
  shopping: ShoppingBag,
  heart: HeartPulse,
  ticket: Ticket,
  book: BookOpen,
  wallet: Wallet,
  work: BriefcaseBusiness,
  credit: CreditCard,
  tag: Tag,
};
export function CategoryIcon({
  icon = "wallet",
  color = "var(--primary)",
  size = 18,
}: {
  icon?: string;
  color?: string;
  size?: number;
}) {
  const Icon = iconOptions[icon as keyof typeof iconOptions] ?? Tag;
  return (
    <span
      className="category-icon"
      style={{ "--category-color": color } as React.CSSProperties}
    >
      <Icon size={size} />
    </span>
  );
}
