"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/low-stock", label: "Low stock" },
  { href: "/admin/import-export", label: "Import / export" },
  { href: "/admin/sample-data", label: "Sample data" },
];

/** The current page is highlighted once the URL is known (pathname is null in the static shell). */
export function AdminNavLinks({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Admin" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
      <ul className="flex w-max gap-1">
        {links.map((link) => {
          const active =
            pathname !== null &&
            (link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href));
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex h-10 items-center rounded-full px-4 text-sm whitespace-nowrap ${
                  active ? "bg-ink text-white" : "text-ink hover:bg-blush-deep"
                }`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function AdminNav() {
  return <AdminNavLinks pathname={usePathname()} />;
}
