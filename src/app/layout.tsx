import type { Metadata } from "next";
import { Cormorant_Garamond, Great_Vibes, Jost } from "next/font/google";

import { siteConfig } from "@/config/site";
import { isSiteIndexable } from "@/lib/site-url";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
});

const greatVibes = Great_Vibes({
  variable: "--font-great-vibes",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: siteConfig.title, template: `%s | ${siteConfig.name}` },
  description: siteConfig.description,
  // Until launch (SITE_INDEXABLE !== "true") every page asks search engines not to index it.
  ...(!isSiteIndexable() && { robots: { index: false, follow: false } }),
  openGraph: {
    title: siteConfig.title,
    description: siteConfig.description,
    siteName: siteConfig.name,
    url: "/",
    type: "website",
    locale: "en_NG",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${jost.variable} ${greatVibes.variable} h-full antialiased`}
    >
      {/* overflow-x-clip is a safety net against sideways page scroll; unlike hidden it keeps the sticky header working. */}
      <body className="flex min-h-full flex-col overflow-x-clip">{children}</body>
    </html>
  );
}
