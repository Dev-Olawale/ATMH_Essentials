import type { Metadata } from "next";

import { StatusPage } from "@/components/coming-soon";
import StoreLayout from "@/app/(store)/layout";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

// Rendered inside the root layout only, so it brings the store header and footer itself.
export default function NotFound() {
  return (
    <StoreLayout>
      <StatusPage
        label="404"
        title="We can't find that page"
        message="It may have moved or sold out for good. Everything else you need is still in one place."
        href="/category"
        action="Browse categories"
      />
    </StoreLayout>
  );
}
