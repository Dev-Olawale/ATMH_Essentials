import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { CheckoutForm, type CheckoutPrefill } from "@/components/checkout/checkout-form";
import { SectionHeading } from "@/components/ui/section-heading";
import { getCustomerUser } from "@/lib/auth/customer";
import { prisma } from "@/lib/db";
import { getPublicSettings } from "@/lib/settings";

// Behind sign-in or a private link: never prefetch (the session check can't run ahead of time).
export const prefetch = "force-disabled";
// Rendered in one pass per request (it reads the session), so nothing jumps as content streams in.
export const instant = false;

export const metadata: Metadata = {
  title: "Checkout",
  description: "Place your ATMH Essentials order.",
  robots: { index: false, follow: false },
};

async function Checkout() {
  const [user, settings] = await Promise.all([getCustomerUser(), getPublicSettings()]);
  const customer = user
    ? await prisma.customer.findUnique({
        where: { id: user.id },
        include: { addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] } },
      })
    : null;
  const prefill: CheckoutPrefill = {
    signedIn: Boolean(user),
    name: customer?.name ?? "",
    email: user?.email ?? "",
    phone: customer?.phone ?? "",
    addresses: (customer?.addresses ?? []).map((address) => ({
      id: address.id,
      state: address.state,
      city: address.city,
      street: address.street,
      landmark: address.landmark,
      isDefault: address.isDefault,
    })),
  };
  return (
    <CheckoutForm
      prefill={prefill}
      rules={{ enabledPaymentMethods: settings.enabledPaymentMethods, podStates: settings.podStates }}
      deliveryNote={settings.deliveryNote}
    />
  );
}

export default function CheckoutPage() {
  // Checkout is rendered in one pass, without a Suspense boundary (see `instant` above).
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 lg:py-8">
      <Breadcrumbs items={[{ label: "Cart", href: "/cart" }, { label: "Checkout" }]} />
      <div className="mt-6 mb-6">
        <SectionHeading as="h1" label="Secure" title="Checkout" />
      </div>
      <Checkout />
    </div>
  );
}
