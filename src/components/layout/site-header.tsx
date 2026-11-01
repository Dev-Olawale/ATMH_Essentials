import { UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { CartLink } from "@/components/layout/cart-link";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { SearchBox } from "@/components/layout/search-box";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { categories, categoryHref } from "@/data/categories";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-white shadow-xs">
      <p className="bg-ink px-4 py-1.5 text-center text-[0.6875rem] tracking-[0.2em] text-white uppercase">
        {siteConfig.announcement}
      </p>
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2 lg:gap-8 lg:py-3">
        <MobileMenu />
        <Link href="/" className="mr-auto shrink-0 lg:mr-0">
          <Image
            src="/brand/atmh-logo.png"
            alt={siteConfig.name}
            width={480}
            height={160}
            preload
            className="h-10 w-auto lg:h-12"
          />
        </Link>
        <SearchBox className="hidden flex-1 lg:block" />
        <div className="flex items-center">
          <Link
            href="/account"
            aria-label="Account"
            className={buttonVariants({ variant: "ghost", size: "icon" })}
          >
            <UserRound className="size-5" />
          </Link>
          <CartLink />
        </div>
      </div>
      <div className="px-4 pb-2 lg:hidden">
        <SearchBox />
      </div>
      <nav aria-label="Categories" className="hidden border-t border-blush-deep lg:block">
        <ul className="mx-auto flex max-w-7xl flex-wrap justify-center gap-x-6 px-4 py-2.5">
          {categories
            .filter((category) => !category.needsConfirmation)
            .map((category) => (
              <li key={category.slug}>
                <Link
                  href={categoryHref(category.slug)}
                  className="text-[0.6875rem] tracking-[0.12em] text-ink uppercase hover:underline"
                >
                  {category.name}
                </Link>
              </li>
            ))}
        </ul>
      </nav>
    </header>
  );
}
