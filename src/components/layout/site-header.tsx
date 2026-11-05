import { UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { CartLink } from "@/components/layout/cart-link";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { SearchBox } from "@/components/layout/search-box";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { getCatalog } from "@/lib/catalog-db";
import { getPublicSettings } from "@/lib/settings";
import { categoryHref } from "@/lib/catalog-types";

export async function SiteHeader() {
  const [{ categories }, { announcement }] = await Promise.all([getCatalog(), getPublicSettings()]);
  return (
    <header className="sticky top-0 z-40 bg-white shadow-xs">
      <p className="bg-ink px-4 py-1.5 text-center text-[0.6875rem] tracking-[0.2em] text-white uppercase">
        {announcement}
      </p>
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2 lg:gap-8 lg:py-3">
        <MobileMenu categories={categories} />
        <Link href="/" className="mr-auto shrink-0 lg:mr-0">
          <Image
            src="/brand/atmh-wordmark.png"
            alt={siteConfig.name}
            width={363}
            height={256}
            preload
            className="h-12 w-auto lg:h-16"
          />
        </Link>
        <SearchBox className="hidden min-w-0 flex-1 lg:block" />
        <div className="flex shrink-0 items-center">
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
      {/* One row that scrolls sideways inside itself. The edge fades sit over the list's own
          padding, so they only cover links when there is more to scroll to. */}
      <nav aria-label="Categories" className="hidden border-t border-blush-deep lg:block">
        <div className="mx-auto max-w-7xl overflow-x-auto [mask-image:linear-gradient(to_right,transparent,black_2rem,black_calc(100%-2rem),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ul className="mx-auto flex w-max gap-x-6 px-8 py-2.5">
            {categories.map((category) => (
              <li key={category.slug} className="shrink-0">
                <Link
                  href={categoryHref(category.slug)}
                  className="text-[0.6875rem] tracking-[0.12em] whitespace-nowrap text-ink uppercase hover:underline"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </header>
  );
}
