"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { CategoryIcon } from "@/components/category-icon";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { categoryHref, type Category } from "@/lib/catalog-types";

export function MobileMenu({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="ghost" size="icon" aria-label="Open menu" className="lg:hidden" />}
      >
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-[85%] max-w-sm overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-serif text-2xl font-medium">Shop by category</SheetTitle>
        </SheetHeader>
        <nav aria-label="Categories" className="px-2 pb-6">
          <ul>
            {categories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={categoryHref(category.slug)}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-2 py-3 text-sm text-ink hover:bg-blush-deep"
                >
                  <CategoryIcon
                    name={category.icon}
                    className="size-5 text-rose-dark"
                    strokeWidth={1.5}
                  />
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
