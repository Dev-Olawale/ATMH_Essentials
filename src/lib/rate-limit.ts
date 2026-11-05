import "server-only";

import { createHash } from "node:crypto";

import { headers } from "next/headers";

import { prisma } from "@/lib/db";

/** The visitor's IP as seen by Vercel (first entry of x-forwarded-for). */
export async function clientIp(): Promise<string> {
  const list = await headers();
  return list.get("x-forwarded-for")?.split(",")[0]?.trim() || list.get("x-real-ip") || "unknown";
}

/** Keys are hashed so the table never holds raw IPs or phone numbers. */
function hashKey(scope: string, value: string): string {
  return `${scope}:${createHash("sha256").update(`${scope}|${value}`).digest("hex").slice(0, 40)}`;
}

/**
 * A simple fixed-window limiter stored in Postgres (works across serverless instances).
 * Returns false when `value` has already been seen `limit` times in the last `windowSeconds`.
 */
export async function rateLimit(scope: string, value: string, limit: number, windowSeconds: number) {
  const key = hashKey(scope, value);
  const since = new Date(Date.now() - windowSeconds * 1000);
  const recent = await prisma.rateLimitHit.count({ where: { key, createdAt: { gte: since } } });
  if (recent >= limit) return false;
  await prisma.rateLimitHit.create({ data: { key } });
  // Occasional cleanup keeps the table small.
  if (Math.random() < 0.02) {
    await prisma.rateLimitHit.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 86_400_000) } } });
  }
  return true;
}
