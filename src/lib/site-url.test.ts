import { describe, expect, it } from "vitest";

import { isSiteIndexable, resolveSiteUrl } from "@/lib/site-url";

describe("resolveSiteUrl", () => {
  it("prefers NEXT_PUBLIC_SITE_URL and trims the trailing slash", () => {
    expect(
      resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://atmh.ng/", VERCEL_URL: "x.vercel.app" }),
    ).toBe("https://atmh.ng");
  });

  it("uses the production domain on Vercel production and the deployment URL on previews", () => {
    const vercel = { VERCEL_URL: "atmh-abc.vercel.app", VERCEL_PROJECT_PRODUCTION_URL: "atmh.vercel.app" };
    expect(resolveSiteUrl({ ...vercel, VERCEL_ENV: "production" })).toBe("https://atmh.vercel.app");
    expect(resolveSiteUrl({ ...vercel, VERCEL_ENV: "preview" })).toBe("https://atmh-abc.vercel.app");
  });

  it("falls back to localhost for local development", () => {
    expect(resolveSiteUrl({})).toBe("http://localhost:3000");
  });
});

describe("isSiteIndexable", () => {
  it("is only true for exactly 'true'", () => {
    expect(isSiteIndexable({ SITE_INDEXABLE: "true" })).toBe(true);
    for (const value of [undefined, "", "TRUE", "1", "yes"]) {
      expect(isSiteIndexable({ SITE_INDEXABLE: value })).toBe(false);
    }
  });
});
