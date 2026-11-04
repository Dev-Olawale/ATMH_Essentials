type Env = Record<string, string | undefined>;

/**
 * The public site URL, without a trailing slash.
 * 1. NEXT_PUBLIC_SITE_URL when set (the real domain at launch).
 * 2. On Vercel: the production domain for production builds, the deployment URL for previews.
 * 3. Local development.
 */
export function resolveSiteUrl(env: Env = process.env): string {
  const explicit = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercelHost =
    env.VERCEL_ENV === "production"
      ? (env.VERCEL_PROJECT_PRODUCTION_URL ?? env.VERCEL_URL)
      : env.VERCEL_URL;
  if (vercelHost) return `https://${vercelHost}`;
  return "http://localhost:3000";
}

/** Search engines may index the site only once SITE_INDEXABLE is exactly "true" (at launch). */
export function isSiteIndexable(env: Env = process.env): boolean {
  return env.SITE_INDEXABLE === "true";
}
