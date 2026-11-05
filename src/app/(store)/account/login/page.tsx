import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { CustomerLoginForm } from "@/app/(store)/account/login/login-form";
import { SectionHeading } from "@/components/ui/section-heading";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to see your orders, saved addresses and reorder in one tap.",
  robots: { index: false, follow: true },
};

async function Form({ searchParams }: { searchParams: PageProps<"/account/login">["searchParams"] }) {
  const { next, error } = await searchParams;
  const target = typeof next === "string" && (next.startsWith("/account") || next === "/checkout") ? next : "/account";
  return (
    <>
      {error === "link" && (
        <p role="alert" className="mb-4 rounded-xl border border-rose-dark bg-white p-3 text-sm text-ink">
          That sign-in link has expired or was already used. Request a new one.
        </p>
      )}
      <CustomerLoginForm next={target} />
    </>
  );
}

export default function CustomerLoginPage({ searchParams }: PageProps<"/account/login">) {
  return (
    <div className="mx-auto max-w-md px-4 py-6 lg:py-8">
      <div className="mb-6">
        <SectionHeading as="h1" label="Your account" title="Sign in or sign up" />
      </div>
      <Suspense fallback={<div aria-hidden="true" className="h-56 animate-pulse rounded-2xl bg-white" />}>
        <Form searchParams={searchParams} />
      </Suspense>
      <p className="mt-4 text-center text-sm text-muted">
        Ordered as a guest?{" "}
        <Link href="/track" className="underline">
          Track your order
        </Link>
      </p>
    </div>
  );
}
