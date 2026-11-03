import type { Metadata } from "next";

import { StatusPage } from "@/components/coming-soon";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Checkout is coming soon to ATMH Essentials.",
  robots: { index: false, follow: true },
};

export default function CheckoutPage() {
  return (
    <StatusPage
      label="Checkout"
      title="Coming soon"
      message="We are putting the finishing touches on checkout. Your cart is saved on this device until then."
      href="/cart"
      action="Back to cart"
    />
  );
}
