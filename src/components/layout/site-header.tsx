import { Search, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { CartLink } from "@/components/layout/cart-link";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { categories, categoryHref } from "@/data/categories";

function SearchBar({ className }: { className?: string }) {
  return (
    <form action="/search" role="search" className={className}>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted"
        />
        <input
          type="search"
          name="q"
          aria-label="Search products"
          placeholder="Search products"
          className="h-10 w-full rounded-full border border-blush-deep bg-blush pr-4 pl-10 text-base text-ink placeholder:text-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none lg:text-sm"
        />
      </div>
    </form>
  );
}

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
        <SearchBar className="hidden flex-1 lg:block" />
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
        <SearchBar />
      </div>
      <nav aria-label="Categories" className="hidden border-t border-blush-deep lg:block">
        <ul className="mx-auto flex max-w-7xl flex-wrap justify-center gap-x-6 px-4 py-2.5">
          {categories
            .filter((category) => !category.needsConfirmation)
            .map((category) => (
              <li key={category.slug}>
                <Link
                  href={categoryHref(category.slug)}
                  className="text-[0.6875rem] tracking-[0.12em] text-ink uppercase hover:text-rose-dark"
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
