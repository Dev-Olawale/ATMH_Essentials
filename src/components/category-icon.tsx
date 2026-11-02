import {
  Baby,
  Bath,
  CookingPot,
  FlaskRound,
  Flower2,
  HandHeart,
  PackageOpen,
  Scissors,
  Smile,
  Sparkles,
  SprayCan,
  WashingMachine,
  type LucideProps,
} from "lucide-react";

// Explicit map so only the icons in use reach the bundle.
const icons = {
  Baby,
  Bath,
  CookingPot,
  FlaskRound,
  Flower2,
  HandHeart,
  PackageOpen,
  Scissors,
  Smile,
  Sparkles,
  SprayCan,
  WashingMachine,
};

export type CategoryIconName = keyof typeof icons;

export function CategoryIcon({ name, ...props }: { name: CategoryIconName } & LucideProps) {
  const Icon = icons[name];
  return <Icon aria-hidden="true" {...props} />;
}
