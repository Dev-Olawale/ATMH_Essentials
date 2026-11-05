import { beforeEach, describe, expect, it, vi } from "vitest";

/** In-memory admin_users table. Customers live elsewhere and are never consulted. */
type Row = { id: string; email: string; role: "OWNER" | "STAFF"; authUserId: string | null };
let rows: Row[] = [];
const customerTable = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    adminUser: {
      findUnique: async ({ where }: { where: { email: string } }) => rows.find((row) => row.email === where.email) ?? null,
      upsert: async ({ where, update, create }: { where: { email: string }; update: Partial<Row>; create: Omit<Row, "id"> }) => {
        const existing = rows.find((row) => row.email === where.email);
        if (existing) return Object.assign(existing, update);
        const row = { id: `a${rows.length + 1}`, ...create, authUserId: create.authUserId ?? null };
        rows.push(row);
        return row;
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<Row> }) =>
        Object.assign(rows.find((row) => row.id === where.id)!, data),
      updateMany: async ({ where, data }: { where: { id: string; authUserId: null }; data: Partial<Row> }) => {
        const row = rows.find((candidate) => candidate.id === where.id && candidate.authUserId === null);
        if (row) Object.assign(row, data);
        return { count: row ? 1 : 0 };
      },
    },
    customer: new Proxy({}, { get: () => customerTable }),
  },
}));

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser } }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));

const { AdminAccessError, findAdmin, requireAdmin, requireAdminPage } = await import("@/lib/auth/admin");

const session = (id: string, email: string | null) => ({ data: { user: email ? { id, email } : null }, error: null });

beforeEach(() => {
  vi.stubEnv("ADMIN_EMAILS", "boss@atmh.ng");
  rows = [
    { id: "s1", email: "staff@atmh.ng", role: "STAFF", authUserId: "u-staff" },
    { id: "o1", email: "owner@atmh.ng", role: "OWNER", authUserId: "u-owner" },
  ];
  getUser.mockReset();
  customerTable.mockReset();
});

describe("requireAdmin", () => {
  it("rejects a signed-out visitor", async () => {
    getUser.mockResolvedValue(session("", null));
    await expect(requireAdmin()).rejects.toMatchObject({ reason: "signed-out" });
    await expect(requireAdminPage()).rejects.toThrow("REDIRECT /admin/login?error=signed-out");
  });

  it("rejects an invalid or expired session", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: new Error("JWT expired") });
    await expect(requireAdmin()).rejects.toBeInstanceOf(AdminAccessError);
  });

  it("rejects a signed-in customer: being a shopper never grants admin access", async () => {
    getUser.mockResolvedValue(session("u-shopper", "shopper@gmail.com"));
    await expect(requireAdmin()).rejects.toMatchObject({ reason: "not-allowed" });
    await expect(requireAdminPage()).rejects.toThrow("REDIRECT /admin/login?error=not-allowed");
    // The customer table is never consulted, and no admin row is created for them.
    expect(customerTable).not.toHaveBeenCalled();
    expect(rows.some((row) => row.email === "shopper@gmail.com")).toBe(false);
  });

  it("lets staff in, but not into owner-only areas", async () => {
    getUser.mockResolvedValue(session("u-staff", "Staff@ATMH.ng"));
    await expect(requireAdmin()).resolves.toEqual({ id: "s1", email: "staff@atmh.ng", role: "STAFF" });
    await expect(requireAdmin("OWNER")).rejects.toMatchObject({ reason: "owner-only" });
    await expect(requireAdminPage("OWNER")).rejects.toThrow("REDIRECT /admin?error=owner-only");
  });

  it("lets an owner in everywhere", async () => {
    getUser.mockResolvedValue(session("u-owner", "owner@atmh.ng"));
    await expect(requireAdmin("OWNER")).resolves.toMatchObject({ role: "OWNER" });
  });

  it("refuses a row that belongs to a different sign-in account", async () => {
    getUser.mockResolvedValue(session("u-someone-else", "staff@atmh.ng"));
    await expect(requireAdmin()).rejects.toMatchObject({ reason: "not-allowed" });
  });

  it("links an invited admin's sign-in account on first sign-in", async () => {
    rows.push({ id: "s2", email: "new@atmh.ng", role: "STAFF", authUserId: null });
    getUser.mockResolvedValue(session("u-new", "new@atmh.ng"));
    await expect(requireAdmin()).resolves.toMatchObject({ role: "STAFF" });
    expect(rows.find((row) => row.id === "s2")?.authUserId).toBe("u-new");
  });
});

describe("ADMIN_EMAILS bootstrap", () => {
  it("creates a missing safety owner as OWNER", async () => {
    await expect(findAdmin("u-boss", "Boss@atmh.ng")).resolves.toMatchObject({ role: "OWNER" });
    expect(rows.find((row) => row.email === "boss@atmh.ng")).toMatchObject({ role: "OWNER", authUserId: "u-boss" });
  });

  it("restores a safety owner who was demoted, so nobody gets locked out", async () => {
    rows.push({ id: "b1", email: "boss@atmh.ng", role: "STAFF", authUserId: "u-boss" });
    await expect(findAdmin("u-boss", "boss@atmh.ng")).resolves.toMatchObject({ role: "OWNER" });
  });

  it("does nothing for emails outside the list", async () => {
    vi.stubEnv("ADMIN_EMAILS", "");
    await expect(findAdmin("u-x", "boss@atmh.ng")).resolves.toBeNull();
  });
});

describe("first sign-in race", () => {
  it("treats a duplicate from a simultaneous check as already created", async () => {
    const { prisma } = (await import("@/lib/db")) as unknown as {
      prisma: { adminUser: { upsert: (...args: unknown[]) => Promise<unknown> } };
    };
    const original = prisma.adminUser.upsert;
    prisma.adminUser.upsert = async () => {
      // The other request created the row a moment earlier.
      rows.push({ id: "b9", email: "boss@atmh.ng", role: "OWNER", authUserId: "u-boss" });
      throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
    };
    try {
      await expect(findAdmin("u-boss", "boss@atmh.ng")).resolves.toEqual({ id: "b9", email: "boss@atmh.ng", role: "OWNER" });
    } finally {
      prisma.adminUser.upsert = original;
    }
  });
});
