-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('OWNER', 'STAFF');

-- CreateEnum
CREATE TYPE "OrderActor" AS ENUM ('CUSTOMER', 'ADMIN', 'SYSTEM');

-- AlterEnum
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM ('AWAITING_DELIVERY_QUOTE', 'AWAITING_PAYMENT', 'CONFIRMED', 'PAID', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED');
ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "OrderStatus_old";
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'AWAITING_DELIVERY_QUOTE';
COMMIT;

-- DropIndex
DROP INDEX "orders_paymentReference_key";

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "addressLine",
DROP COLUMN "deliveryZone",
DROP COLUMN "paymentReference",
ADD COLUMN     "accessKey" TEXT NOT NULL,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "dispatchNote" TEXT,
ADD COLUMN     "landmark" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "phoneNormalized" TEXT NOT NULL,
ADD COLUMN     "providerReference" TEXT,
ADD COLUMN     "quotedAt" TIMESTAMP(3),
ADD COLUMN     "riderName" TEXT,
ADD COLUMN     "riderPhone" TEXT,
ADD COLUMN     "street" TEXT NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'AWAITING_DELIVERY_QUOTE',
ALTER COLUMN "deliveryFeeKobo" DROP NOT NULL,
ALTER COLUMN "totalKobo" DROP NOT NULL;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "productSlug" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "authUserId" TEXT,
    "role" "AdminRole" NOT NULL DEFAULT 'STAFF',
    "invitedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "landmark" TEXT NOT NULL DEFAULT '',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_settings" (
    "id" TEXT NOT NULL DEFAULT 'store',
    "whatsappNumber" TEXT NOT NULL,
    "notificationEmails" TEXT[],
    "bankName" TEXT,
    "bankAccountName" TEXT,
    "bankAccountNumber" TEXT,
    "enabledPaymentMethods" "PaymentMethod"[],
    "podStates" TEXT[],
    "announcement" TEXT NOT NULL,
    "deliveryNote" TEXT NOT NULL,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_events" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fromStatus" "OrderStatus",
    "toStatus" "OrderStatus" NOT NULL,
    "actor" "OrderActor" NOT NULL,
    "actorEmail" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_proofs" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "path" TEXT,
    "fileName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "reference" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_proofs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limit_hits" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limit_hits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_authUserId_key" ON "admin_users"("authUserId");

-- CreateIndex
CREATE INDEX "addresses_customerId_idx" ON "addresses"("customerId");

-- CreateIndex
CREATE INDEX "order_status_events_orderId_createdAt_idx" ON "order_status_events"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "payment_proofs_orderId_idx" ON "payment_proofs"("orderId");

-- CreateIndex
CREATE INDEX "rate_limit_hits_key_createdAt_idx" ON "rate_limit_hits"("key", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "orders_providerReference_key" ON "orders"("providerReference");

-- CreateIndex
CREATE UNIQUE INDEX "orders_accessKey_key" ON "orders"("accessKey");

-- CreateIndex
CREATE INDEX "orders_customerId_createdAt_idx" ON "orders"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "orders_phoneNormalized_idx" ON "orders"("phoneNormalized");

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_events" ADD CONSTRAINT "order_status_events_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_proofs" ADD CONSTRAINT "payment_proofs_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Readable order numbers: ATMH-10001 onwards.
ALTER SEQUENCE "orders_number_seq" RESTART WITH 10001;

-- Default store settings (owner edits these in Admin → Settings).
-- Bank details are left empty on purpose: the owner enters them in the admin.
INSERT INTO "store_settings" (
  "id", "whatsappNumber", "notificationEmails", "enabledPaymentMethods", "podStates",
  "announcement", "deliveryNote", "updatedAt"
) VALUES (
  'store', '2348116336407', ARRAY[]::TEXT[],
  ARRAY['BANK_TRANSFER', 'PAY_ON_DELIVERY']::"PaymentMethod"[], ARRAY['Lagos']::TEXT[],
  'Nationwide delivery',
  'We deliver nationwide. The delivery fee depends on your location and is confirmed after you order.',
  CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO NOTHING;

-- Row Level Security for the new tables. The app uses Prisma as the database owner (bypasses RLS);
-- these rules protect Supabase's public Data API. Signed-in customers may read only their own
-- profile, addresses and orders. Payment proofs, settings, admins and rate limits are never exposed.
ALTER TABLE "admin_users"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "customers"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "addresses"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "store_settings"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_status_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_proofs"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rate_limit_hits"     ENABLE ROW LEVEL SECURITY;
-- orders and order_items already have RLS enabled (no policies until now).

CREATE POLICY "Customers read their own profile"
  ON "customers" FOR SELECT TO authenticated
  USING ("id" = (SELECT auth.uid())::text);

CREATE POLICY "Customers read their own addresses"
  ON "addresses" FOR SELECT TO authenticated
  USING ("customerId" = (SELECT auth.uid())::text);

CREATE POLICY "Customers read their own orders"
  ON "orders" FOR SELECT TO authenticated
  USING ("customerId" = (SELECT auth.uid())::text);

CREATE POLICY "Customers read items of their own orders"
  ON "order_items" FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM "orders" o
    WHERE o."id" = "order_items"."orderId" AND o."customerId" = (SELECT auth.uid())::text
  ));

CREATE POLICY "Customers read the history of their own orders"
  ON "order_status_events" FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM "orders" o
    WHERE o."id" = "order_status_events"."orderId" AND o."customerId" = (SELECT auth.uid())::text
  ));
