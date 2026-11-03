-- Row Level Security (CLAUDE.md Step 3 §4).
-- The app talks to Postgres through Prisma as the database owner, which bypasses RLS.
-- These policies protect the Supabase Data API (anon / authenticated roles):
-- only active categories, active products and their images are publicly readable.
-- Every other table, and every write, is denied to those roles.

-- Top-level category slugs must be unique too ((parentId, slug) treats NULLs as distinct).
CREATE UNIQUE INDEX "categories_root_slug_key" ON "categories" ("slug") WHERE "parentId" IS NULL;

ALTER TABLE "categories"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "products"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_variants"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_images"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tags"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_tags"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "orders"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_items"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active categories"
  ON "categories" FOR SELECT TO anon, authenticated
  USING ("active");

CREATE POLICY "Public can read active products"
  ON "products" FOR SELECT TO anon, authenticated
  USING ("active");

CREATE POLICY "Public can read images of active products"
  ON "product_images" FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM "products" p WHERE p."id" = "product_images"."productId" AND p."active"
  ));
