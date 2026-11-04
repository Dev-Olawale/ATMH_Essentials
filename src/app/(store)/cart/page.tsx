import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { CartPageContents } from "@/components/cart/cart-contents";
import { SectionHeading } from "@/components/ui/section-heading";

export const metadata: Metadata = {
  title: "Your Cart",
  description: "Review the items in your ATMH Essentials cart.",
  robots: { index: false, follow: true },
};

export default function CartPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 lg:py-8">
      <Breadcrumbs items={[{ label: "Cart" }]} />
      <div className="my-6">
        <SectionHeading as="h1" label="Ready when you are" title="Your Cart" />
      </div>
      <CartPageContents />
    </div>
  );
}
