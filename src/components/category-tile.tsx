import Link from "next/link";

import { CategoryIcon } from "@/components/category-icon";
import { categoryHref, type Category } from "@/data/categories";

export function CategoryTile({ category }: { category: Category }) {
  return (
    <Link
      href={categoryHref(category.slug)}
      className="group flex h-full flex-col items-center gap-3 rounded-2xl bg-white p-3 text-center transition-colors hover:bg-blush-deep focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:p-5"
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-blush text-rose-dark transition-colors group-hover:bg-white sm:size-16">
        <CategoryIcon name={category.icon} className="size-6 sm:size-7" strokeWidth={1.5} />
      </span>
      <span className="text-xs leading-snug font-medium text-ink sm:text-sm">{category.name}</span>
    </Link>
  );
}
