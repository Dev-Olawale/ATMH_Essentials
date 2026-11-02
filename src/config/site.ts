export const siteConfig = {
  name: "ATMH Essentials",
  title: "ATMH Essentials | Home. Beauty. Everyday Living.",
  description:
    "Household, cleaning, personal care, beauty and baby essentials, delivered across Nigeria. Everything you need, all in one place.",
  tagline: "Everything you need, all in one place.",
  // PLACEHOLDER: replace once the domain is confirmed (CLAUDE.md §7).
  url: "http://localhost:3000",
  // PLACEHOLDER: replace with the business number, digits only with country code.
  whatsappNumber: "2340000000000",
  announcement: "Fast delivery across Lagos",
} as const;

export const whatsappHref = `https://wa.me/${siteConfig.whatsappNumber}`;

export const infoLinks = [
  { label: "About", href: "/about" },
  { label: "Delivery & Returns", href: "/delivery-returns" },
  { label: "Contact", href: "/contact" },
  { label: "FAQ", href: "/faq" },
] as const;
