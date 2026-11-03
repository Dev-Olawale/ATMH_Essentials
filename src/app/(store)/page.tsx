import { BadgeCheck, HeartHandshake, Truck, Wallet } from "lucide-react";
import Link from "next/link";

import { CategoryIcon } from "@/components/category-icon";
import { CategoryTile } from "@/components/category-tile";
import { ProductCard } from "@/components/product-card";
import { buttonVariants } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { SectionHeading } from "@/components/ui/section-heading";
import { bestSellers, newArrivals } from "@/lib/catalog";
import { getCatalog } from "@/lib/catalog-db";
import { categoryHref, type Category, type Product } from "@/lib/catalog-types";

const trustItems = [
  { label: "Quality Products", Icon: BadgeCheck },
  { label: "Affordable Prices", Icon: Wallet },
  { label: "Fast & Reliable Delivery", Icon: Truck },
  { label: "Your Satisfaction Our Priority", Icon: HeartHandshake },
];

function Hero({ categories }: { categories: Category[] }) {
  return (
    <section className="px-4 py-14 sm:py-20">
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
        <div className="flex flex-col items-center gap-6 text-center lg:items-start lg:text-left">
          <h1 className="text-[2.5rem] leading-[1.05] font-medium text-ink sm:text-6xl">
            Everything you need,{" "}
            <span className="block pt-2 font-script text-[1.05em] font-normal text-rose-dark">
              all in one place.
            </span>
          </h1>
          <p className="text-sm tracking-[0.2em] text-muted uppercase">
            Home. Beauty. Everyday Living.
          </p>
          <Link href="#categories" className={buttonVariants({ variant: "rose", size: "lg" })}>
            Shop Now
          </Link>
        </div>
        <div
          aria-hidden="true"
          className="mx-auto hidden aspect-[4/3] w-full max-w-lg grid-cols-3 gap-4 rounded-t-[12rem] bg-blush-deep p-12 pt-24 text-rose-dark lg:grid"
        >
          {categories.slice(0, 6).map((category) => (
            <div key={category.slug} className="flex items-center justify-center">
              <CategoryIcon name={category.icon} className="size-12" strokeWidth={1} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductRow({ label, title, items }: { label: string; title: string; items: Product[] }) {
  if (items.length === 0) return null;
  return (
    <section className="py-12">
      <div className="mx-auto max-w-7xl">
        <div className="px-4">
          <SectionHeading label={label} title={title} />
        </div>
        {/* Swipeable on mobile; a single row of four on desktop. Do not add scroll-smooth here: on a snap container it stops Chrome recording LCP. */}
        <ul className="mt-8 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:gap-4 lg:grid lg:grid-cols-4 lg:overflow-visible lg:[&>li:nth-child(n+5)]:hidden">
          {items.map((product) => (
            <li key={product.slug} className="w-44 shrink-0 snap-start sm:w-56 lg:w-auto">
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default async function Home() {
  const { categories, products } = await getCatalog();
  return (
    <>
      <Hero categories={categories} />
      <Divider />
      <section id="categories" className="px-4 py-12">
        <div className="mx-auto max-w-7xl">
          <SectionHeading label="Browse" title="Shop by Category" />
          <ul className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-6">
            {categories.map((category) => (
              <li key={category.slug}>
                <CategoryTile category={category} />
              </li>
            ))}
          </ul>
        </div>
      </section>
      <ProductRow
        label="Customer favourites"
        title="Best Sellers"
        items={bestSellers(products)}
      />
      <section className="bg-rose px-4 py-12 text-center">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4">
          <p className="text-xs tracking-[0.25em] text-ink uppercase">Running low?</p>
          <h2 className="text-4xl font-medium text-ink">Restock your home</h2>
          <p className="text-ink">
            Detergent, dish liquid, toilet paper and more. Get your household staples in one order.
          </p>
          <Link
            href={categoryHref("cleaning-and-household")}
            className={buttonVariants({ size: "lg" })}
          >
            Shop household essentials
          </Link>
        </div>
      </section>
      <ProductRow label="Just arrived" title="New In" items={newArrivals(products)} />
      <section aria-label="Why shop with us" className="bg-white px-4 py-8">
        <ul className="mx-auto grid max-w-7xl grid-cols-2 gap-6 lg:grid-cols-4">
          {trustItems.map(({ label, Icon }) => (
            <li key={label} className="flex flex-col items-center gap-2 text-center">
              <Icon aria-hidden="true" className="size-6 text-gold-dark" strokeWidth={1.5} />
              <span className="text-xs leading-snug font-medium text-ink sm:text-sm">{label}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
