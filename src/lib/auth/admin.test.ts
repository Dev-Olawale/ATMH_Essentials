import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser } }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));

const { AdminAccessError, requireAdmin, requireAdminPage } = await import("@/lib/auth/admin");

const session = (email: string | null) => ({ data: { user: email ? { id: "u1", email } : null }, error: null });

describe("requireAdmin", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_EMAILS", "owner@atmh.ng");
    getUser.mockReset();
  });

  it("rejects a signed-out visitor", async () => {
    getUser.mockResolvedValue(session(null));
    await expect(requireAdmin()).rejects.toMatchObject({ reason: "signed-out" });
    await expect(requireAdminPage()).rejects.toThrow("REDIRECT /admin/login?error=signed-out");
  });

  it("rejects an invalid or expired session", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: new Error("JWT expired") });
    await expect(requireAdmin()).rejects.toBeInstanceOf(AdminAccessError);
  });

  it("rejects a signed-in user who is not on the allowlist", async () => {
    getUser.mockResolvedValue(session("customer@gmail.com"));
    await expect(requireAdmin()).rejects.toMatchObject({ reason: "not-allowed" });
    await expect(requireAdminPage()).rejects.toThrow("REDIRECT /admin/login?error=not-allowed");
  });

  it("lets an allowlisted admin through", async () => {
    getUser.mockResolvedValue(session("Owner@ATMH.ng"));
    await expect(requireAdmin()).resolves.toEqual({ id: "u1", email: "Owner@ATMH.ng" });
    await expect(requireAdminPage()).resolves.toMatchObject({ id: "u1" });
  });

  it("rejects everyone when ADMIN_EMAILS is empty", async () => {
    vi.stubEnv("ADMIN_EMAILS", "");
    getUser.mockResolvedValue(session("owner@atmh.ng"));
    await expect(requireAdmin()).rejects.toMatchObject({ reason: "not-allowed" });
  });
});
