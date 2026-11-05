import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { signOutCustomer } from "@/app/(store)/account/actions";
import { AddressManager, ProfileForm } from "@/components/account/account-forms";
import { ReorderButton } from "@/components/orders/reorder-button";
import { SectionHeading } from "@/components/ui/section-heading";
import { requireCustomerPage } from "@/lib/auth/customer";
import { prisma } from "@/lib/db";
import { formatNaira } from "@/lib/format";
import { formatOrderNumber, STATUS_LABELS } from "@/lib/orders/status";

// Behind sign-in or a private link: never prefetch (the session check can't run ahead of time).
export const prefetch = "force-disabled";

export const metadata: Metadata = {
  title: "Your Account",
  robots: { index: false, follow: false },
};

const dateFormat = new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" });

async function Account() {
  const user = await requireCustomerPage();
  const customer = await prisma.customer.findUniqueOrThrow({
    where: { id: user.id },
    include: {
      addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] },
      orders: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { items: { select: { quantity: true } } },
      },
    },
  });

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
      <section aria-labelledby="orders-heading" className="rounded-2xl bg-white p-4 sm:p-6">
        <h2 id="orders-heading" className="font-sans text-sm font-medium tracking-widest uppercase">
          Your orders
        </h2>
        {customer.orders.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            No orders yet. <Link href="/category" className="underline">Start shopping</Link>
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {customer.orders.map((order) => {
              const ref = formatOrderNumber(order.number);
              const count = order.items.reduce((sum, item) => sum + item.quantity, 0);
              return (
                <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blush-deep p-3">
                  <div className="min-w-0">
                    <Link href={`/order/${ref}`} className="font-medium text-ink underline">
                      {ref}
                    </Link>
                    <p className="text-xs text-muted">
                      {dateFormat.format(order.createdAt)} · {count} item{count === 1 ? "" : "s"} ·{" "}
                      {formatNaira(order.totalKobo ?? order.subtotalKobo)}
                      {order.totalKobo === null && " + delivery"}
                    </p>
                    <p className="mt-1 text-xs tracking-widest text-ink uppercase">{STATUS_LABELS[order.status]}</p>
                  </div>
                  <ReorderButton orderNumber={ref} size="sm" />
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <div className="flex flex-col gap-6">
        <section aria-labelledby="details-heading" className="rounded-2xl bg-white p-4 sm:p-6">
          <h2 id="details-heading" className="mb-3 font-sans text-sm font-medium tracking-widest uppercase">
            Your details
          </h2>
          <ProfileForm name={customer.name} phone={customer.phone} email={customer.email} />
        </section>
        <section aria-labelledby="addresses-heading" className="rounded-2xl bg-white p-4 sm:p-6">
          <h2 id="addresses-heading" className="mb-3 font-sans text-sm font-medium tracking-widest uppercase">
            Saved addresses
          </h2>
          <AddressManager
            addresses={customer.addresses.map(({ id, state, city, street, landmark, isDefault }) => ({
              id,
              state,
              city,
              street,
              landmark,
              isDefault,
            }))}
          />
        </section>
        <form action={signOutCustomer}>
          <button type="submit" className="text-sm underline">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 lg:py-8">
      <div className="mb-6">
        <SectionHeading as="h1" label="Welcome back" title="Your Account" />
      </div>
      <Suspense fallback={<div aria-hidden="true" className="h-96 animate-pulse rounded-2xl bg-white" />}>
        <Account />
      </Suspense>
    </div>
  );
}
