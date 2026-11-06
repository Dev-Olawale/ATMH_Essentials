import { existsSync } from "node:fs";

import { defineConfig } from "prisma/config";

// Prisma 7 no longer reads .env files itself. Locally the values live in .env.local;
// on Vercel they come from the project's environment variables.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // `npx prisma db seed` loads the starting catalogue (safe to re-run).
    seed: "tsx scripts/load-catalogue.ts",
  },
  // Migrations use the session pooler (DIRECT_URL). `prisma generate` needs no URL,
  // so a Vercel build without DIRECT_URL still works.
  ...(process.env.DIRECT_URL && { datasource: { url: process.env.DIRECT_URL } }),
});
