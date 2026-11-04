import type { Metadata } from "next";
import { Suspense } from "react";

import { signOut } from "@/app/admin/login/actions";
import { LoginForm } from "@/app/admin/login/login-form";

export const metadata: Metadata = { title: "Sign in" };

const messages: Record<string, string> = {
  "signed-out": "Please sign in to continue.",
  "not-allowed": "This account doesn't have admin access. Sign out and use an admin email.",
  link: "That sign-in link has expired or was already used. Request a new one.",
};

async function LoginMessage({ searchParams }: { searchParams: PageProps<"/admin/login">["searchParams"] }) {
  const { error } = await searchParams;
  const message = typeof error === "string" ? messages[error] : undefined;
  if (!message) return null;
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-lg border border-rose-dark bg-blush p-3 text-sm text-ink">
      <p>{message}</p>
      {error === "not-allowed" && (
        <form action={signOut}>
          <button type="submit" className="underline">
            Sign out
          </button>
        </form>
      )}
    </div>
  );
}

export default function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <div>
        <p className="text-xs tracking-[0.25em] text-muted uppercase">ATMH Essentials</p>
        <h1 className="mt-1 text-4xl font-medium text-ink">Admin sign in</h1>
        <p className="mt-2 text-sm text-muted">
          Enter your email and we&apos;ll send you a link. No password needed.
        </p>
      </div>
      <Suspense>
        <LoginMessage searchParams={searchParams} />
      </Suspense>
      <LoginForm />
    </main>
  );
}
