import { resolveSiteUrl } from "@/lib/site-url";

export const siteConfig = {
  name: "ATMH Essentials",
  title: "ATMH Essentials | Home. Beauty. Everyday Living.",
  description:
    "Household, cleaning, personal care, beauty and baby essentials, delivered across Nigeria. Everything you need, all in one place.",
  tagline: "Everything you need, all in one place.",
  /** From NEXT_PUBLIC_SITE_URL, else Vercel's URL; see src/lib/site-url.ts. Server-side use only. */
  url: resolveSiteUrl(),
  // The WhatsApp number and announcement bar text are store settings (Admin → Settings).
} as const;

/** A page's openGraph replaces the root one entirely, so shared fields are repeated here. */
export function pageOpenGraph(title: string, description: string, url: string, images: string[] = []) {
  return {
    title,
    description,
    url,
    siteName: siteConfig.name,
    type: "website" as const,
    locale: "en_NG",
    images: images.length > 0 ? images : ["/opengraph-image"],
  };
}

export const infoLinks = [
  { label: "About", href: "/about" },
  { label: "Track your order", href: "/track" },
  { label: "Delivery & Returns", href: "/delivery-returns" },
  { label: "Contact", href: "/contact" },
  { label: "FAQ", href: "/faq" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
] as const;
