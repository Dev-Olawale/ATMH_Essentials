import Link from "next/link";

import { FacebookIcon, InstagramIcon, TikTokIcon } from "@/components/social-icons";
import { Divider } from "@/components/ui/divider";
import { infoLinks, siteConfig } from "@/config/site";
import { getCatalog } from "@/lib/catalog-db";
import { categoryHref } from "@/lib/catalog-types";

// PLACEHOLDER: handles are still to be confirmed (CLAUDE.md §7).
const socials = [
  { label: "Instagram", href: "#", Icon: InstagramIcon },
  { label: "Facebook", href: "#", Icon: FacebookIcon },
  { label: "TikTok", href: "#", Icon: TikTokIcon },
];

async function CopyrightYear() {
  "use cache";
  return <>{new Date().getFullYear()}</>;
}

export async function SiteFooter() {
  const { categories } = await getCatalog();
  return (
    <footer className="bg-blush-deep px-4 pt-12 pb-24 lg:pb-12">
      <div className="mx-auto max-w-7xl">
        <p className="text-center font-script text-3xl text-rose-dark sm:text-4xl">
          {siteConfig.tagline}
        </p>
        <div className="my-8">
          <Divider />
        </div>
        <div className="grid gap-8 sm:grid-cols-[2fr_1fr_1fr]">
          <nav aria-label="Footer categories">
            <h2 className="mb-3 font-sans text-xs font-medium tracking-[0.2em] text-ink uppercase">
              Shop
            </h2>
            <ul className="grid grid-cols-2 gap-x-4 text-sm text-muted">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={categoryHref(category.slug)}
                    className="inline-block py-1.5 hover:text-ink"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Information">
            <h2 className="mb-3 font-sans text-xs font-medium tracking-[0.2em] text-ink uppercase">
              Information
            </h2>
            <ul className="text-sm text-muted">
              {infoLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="inline-block py-1.5 hover:text-ink">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <h2 className="mb-3 font-sans text-xs font-medium tracking-[0.2em] text-ink uppercase">
              Follow us
            </h2>
            <ul className="-ml-2.5 flex text-ink">
              {socials.map(({ label, href, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    aria-label={label}
                    className="flex size-11 items-center justify-center hover:text-rose-dark"
                  >
                    <Icon className="size-5" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-8 border-t border-rose/40 pt-6 text-center text-xs text-muted">
          © <CopyrightYear /> {siteConfig.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
