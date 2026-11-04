import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set.");
  // DATABASE_URL is Supabase's transaction pooler (port 6543). node-postgres sends unnamed
  // prepared statements, which the pooler supports. A small pool suits serverless functions.
  return new PrismaClient({ adapter: new PrismaPg({ connectionString, max: 5 }) });
}

// Reuse one client across hot reloads in development.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
