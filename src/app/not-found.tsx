import type { Metadata } from "next";

import { StatusPage } from "@/components/coming-soon";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <StatusPage
      label="404"
      title="We can't find that page"
      message="It may have moved or sold out for good. Everything else you need is still in one place."
      href="/category"
      action="Browse categories"
    />
  );
}
