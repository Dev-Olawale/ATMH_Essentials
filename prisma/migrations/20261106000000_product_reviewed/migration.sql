-- Owner review workflow: products start unreviewed until the owner checks price and stock.
ALTER TABLE "products" ADD COLUMN "reviewed" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "products_reviewed_idx" ON "products" ("reviewed");
