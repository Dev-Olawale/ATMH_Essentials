import type { Metadata } from "next";

// Behind sign-in or a private link: never prefetch (the session check can't run ahead of time).
export const prefetch = "force-disabled";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | ATMH Admin" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-full flex-1 flex-col bg-blush">{children}</div>;
}
