ALTER TABLE "Product" ADD COLUMN "inventoryVersion" INTEGER NOT NULL DEFAULT 0, ADD COLUMN "compatibilityEn" TEXT;
ALTER TABLE "Variant" ADD COLUMN "inventoryVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "InventoryMovement" ADD COLUMN "actorId" TEXT;
ALTER TABLE "Order" ADD COLUMN "payloadFingerprint" TEXT, ADD COLUMN "accessTokenHash" TEXT, ADD COLUMN "confirmedAt" TIMESTAMP(3), ADD COLUMN "taxRateBps" INTEGER, ADD COLUMN "taxAmount" INTEGER NOT NULL DEFAULT 0, ADD COLUMN "taxLabel" TEXT, ADD COLUMN "taxMode" TEXT NOT NULL DEFAULT 'UNCONFIGURED';
ALTER TABLE "Payment" ADD COLUMN "resolution" TEXT NOT NULL DEFAULT 'APPLIED';
CREATE INDEX "InventoryMovement_productId_createdAt_idx" ON "InventoryMovement"("productId","createdAt");
CREATE INDEX "Order_status_reservationExpiresAt_idx" ON "Order"("status","reservationExpiresAt");
CREATE INDEX "Product_categoryId_active_createdAt_idx" ON "Product"("categoryId","active","createdAt");
CREATE TABLE "PaymentAttempt" ("id" TEXT PRIMARY KEY,"orderId" TEXT NOT NULL,"reference" TEXT NOT NULL UNIQUE,"transactionId" TEXT UNIQUE,"url" TEXT,"status" TEXT NOT NULL DEFAULT 'CREATED',"nextCheckAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"checks" INTEGER NOT NULL DEFAULT 0,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "PaymentAttempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE);
CREATE INDEX "PaymentAttempt_status_nextCheckAt_idx" ON "PaymentAttempt"("status","nextCheckAt");
CREATE TABLE "Refund" ("id" TEXT PRIMARY KEY,"orderId" TEXT NOT NULL,"paymentReference" TEXT NOT NULL UNIQUE,"providerReference" TEXT UNIQUE,"amount" INTEGER NOT NULL,"status" TEXT NOT NULL DEFAULT 'REQUESTED',"reason" TEXT NOT NULL,"actorId" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "Refund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE);
CREATE INDEX "Refund_status_createdAt_idx" ON "Refund"("status","createdAt");
CREATE TABLE "WorkerHeartbeat" ("id" TEXT PRIMARY KEY,"lastSuccessAt" TIMESTAMP(3) NOT NULL,"result" JSONB NOT NULL);
-- Existing pending COD reservations gain a review window; confirmed/fulfilled history remains untouched.
UPDATE "Order" SET "reservationExpiresAt" = CURRENT_TIMESTAMP + INTERVAL '24 hours' WHERE method='cod' AND status='PENDING' AND "stockReleased"=false AND "reservationExpiresAt" IS NULL;
