/**
 * Every admin Server Action and Route Handler must refuse to run for a signed-out visitor
 * or a signed-in user who is not an admin, before it reads input or touches any data.
 * New actions added to these modules are picked up automatically.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdminAccessError } from "@/lib/auth/admin";

let denial: AdminAccessError;
const touched: string[] = [];

// Any use of the database or Supabase storage counts as a failure.
function tripwire(name: string): unknown {
  return new Proxy(() => {}, {
    get: (_target, property) => (property === "then" ? undefined : tripwire(`${name}.${String(property)}`)),
    apply: () => {
      touched.push(name);
      throw new Error(`${name} was called`);
    },
  });
}

vi.mock("@/lib/auth/admin", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/admin")>();
  return {
    ...actual,
    requireAdmin: vi.fn(async () => {
      throw denial;
    }),
    requireAdminPage: vi.fn(async () => {
      throw denial;
    }),
  };
});
vi.mock("@/lib/db", () => ({ prisma: tripwire("prisma") }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: tripwire("supabaseAdmin") }));
vi.mock("next/cache", () => ({ updateTag: tripwire("updateTag"), revalidateTag: tripwire("revalidateTag") }));
vi.mock("next/navigation", () => ({ redirect: tripwire("redirect"), notFound: tripwire("notFound") }));

const actionModules = {
  products: await import("@/app/admin/actions/products"),
  images: await import("@/app/admin/actions/images"),
  categories: await import("@/app/admin/actions/categories"),
  import: await import("@/app/admin/actions/import"),
  "sample-data": await import("@/app/admin/actions/sample-data"),
};
const imagesRoute = await import("@/app/admin/api/products/[id]/images/route");
const exportRoute = await import("@/app/admin/api/products/export/route");

// Plausible arguments, so a missing guard would reach the database instead of failing on input.
function formData() {
  const form = new FormData();
  form.set("id", "p1");
  form.set("name", "Test");
  form.set("slug", "test");
  form.set("confirm", "REMOVE");
  form.set("variants", JSON.stringify([{ label: "1", sku: "T-1", price: "100", compareAt: "", stock: "1", lowStockThreshold: "1" }]));
  return form;
}
const argsFor: Record<string, unknown[]> = {
  saveProduct: [{ status: "idle" }, formData()],
  setProductActive: ["p1", false],
  updateVariantStock: ["v1", 5],
  updateImageAlt: ["i1", "alt"],
  moveImage: ["i1", "up"],
  deleteImage: ["i1"],
  saveCategory: [{ status: "idle" }, formData()],
  moveCategory: ["c1", "up"],
  setCategoryFlag: ["c1", "active", false],
  previewProductImport: ["product_slug\nx"],
  applyProductImport: ["product_slug\nx"],
  removeSampleData: [{ status: "idle" }, formData()],
};

const actions = Object.entries(actionModules).flatMap(([file, module]) =>
  Object.entries(module)
    .filter(([, value]) => typeof value === "function")
    .map(([name, fn]) => ({ label: `${file}.${name}`, name, fn: fn as (...args: unknown[]) => Promise<unknown> })),
);

describe.each([
  ["signed out", "signed-out" as const, 401],
  ["signed in without admin access", "not-allowed" as const, 403],
])("admin access when %s", (_label, reason, status) => {
  beforeEach(() => {
    denial = new AdminAccessError(reason);
    touched.length = 0;
  });
  afterEach(() => {
    expect(touched).toEqual([]);
  });

  it("covers every exported action", () => {
    expect(actions.map((action) => action.name).sort()).toEqual(Object.keys(argsFor).sort());
  });

  it.each(actions)("$label is rejected", async ({ name, fn }) => {
    await expect(fn(...argsFor[name])).rejects.toBe(denial);
  });

  it("rejects photo uploads", async () => {
    const body = new FormData();
    body.set("file", new File([new Uint8Array(10)], "a.webp", { type: "image/webp" }));
    const response = await imagesRoute.POST(
      new Request("http://localhost/admin/api/products/p1/images", { method: "POST", body }) as never,
      { params: Promise.resolve({ id: "p1" }) },
    );
    expect(response.status).toBe(status);
  });

  it("rejects the CSV export", async () => {
    const response = await exportRoute.GET();
    expect(response.status).toBe(status);
    expect(await response.text()).not.toContain("product_slug");
  });
});
