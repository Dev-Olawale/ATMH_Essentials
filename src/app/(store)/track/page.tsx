import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { SectionHeading } from "@/components/ui/section-heading";
import { TrackForm } from "@/app/(store)/track/track-form";

export const metadata: Metadata = {
  title: "Track your order",
  description: "Check the status of your ATMH Essentials order with your order number and phone number.",
  robots: { index: false, follow: true },
};

export default function TrackPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-6 lg:py-8">
      <Breadcrumbs items={[{ label: "Track your order" }]} />
      <div className="mt-6 mb-6">
        <SectionHeading as="h1" label="Orders" title="Track your order" />
      </div>
      <TrackForm />
      <p className="mt-4 text-center text-sm text-muted">
        Have an account?{" "}
        <Link href="/account" className="underline">
          See all your orders
        </Link>
      </p>
    </div>
  );
}
