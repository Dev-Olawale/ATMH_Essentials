import type { Metadata } from "next";

import { StatusPage } from "@/components/coming-soon";

export const metadata: Metadata = {
  title: "Your Account",
  description: "Customer accounts are coming soon to ATMH Essentials.",
  robots: { index: false, follow: true },
};

export default function AccountPage() {
  return (
    <StatusPage
      label="Your account"
      title="Coming soon"
      message="Order history, saved addresses and one-tap reorder are on the way."
      href="/category"
      action="Keep shopping"
    />
  );
}
