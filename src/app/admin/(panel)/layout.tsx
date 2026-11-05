import Link from "next/link";
import { Suspense } from "react";

import { signOut } from "@/app/admin/login/actions";
import { AdminNav, AdminNavLinks } from "@/components/admin/admin-nav";
import { AdminLoading } from "@/components/admin/page-header";
import { requireAdminPage } from "@/lib/auth/admin";

/**
 * Checks access before drawing any admin chrome, so customers and signed-out visitors never see
 * the admin navigation. Each page, Server Action and Route Handler still checks for itself,
 * because a layout does not re-run on every navigation.
 */
async function AdminShell({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-blush-deep bg-white px-4 pt-[env(safe-area-inset-top)] print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 py-2">
          <Link href="/admin" className="font-serif text-xl text-ink">
            ATMH Admin
          </Link>
          <div className="flex items-center gap-1">
            <Link href="/" className="inline-flex h-10 items-center px-3 text-sm text-muted hover:text-ink">
              View store
            </Link>
            <form action={signOut}>
              <button type="submit" className="inline-flex h-10 items-center px-3 text-sm text-ink underline">
                Sign out
              </button>
            </form>
          </div>
        </div>
        <div className="mx-auto max-w-5xl pb-2">
          <Suspense fallback={<AdminNavLinks pathname={null} role={admin.role} />}>
            <AdminNav role={admin.role} />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
          <AdminLoading />
        </main>
      }
    >
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
