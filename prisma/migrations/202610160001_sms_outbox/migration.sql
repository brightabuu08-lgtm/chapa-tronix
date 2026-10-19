-- Additive only: preserves existing products, users, orders and inventory.
CREATE TABLE "SmsJob" (
 "id" TEXT NOT NULL, "dedupeKey" TEXT NOT NULL, "fingerprint" TEXT NOT NULL,
 "provider" TEXT NOT NULL, "recipient" TEXT NOT NULL, "sender" TEXT NOT NULL,
 "text" TEXT NOT NULL, "encoding" TEXT NOT NULL, "segments" INTEGER NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'QUEUED', "attempts" INTEGER NOT NULL DEFAULT 0,
 "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiresAt" TIMESTAMP(3) NOT NULL,
 "lockedAt" TIMESTAMP(3), "providerMessageId" TEXT, "lastError" TEXT, "actorId" TEXT NOT NULL,
 "orderId" TEXT, "orderStatus" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL, "acceptedAt" TIMESTAMP(3), "deliveredAt" TIMESTAMP(3),
 CONSTRAINT "SmsJob_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "SmsJob_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "SmsEvent" (
 "id" TEXT NOT NULL, "jobId" TEXT NOT NULL, "providerEventId" TEXT NOT NULL,
 "status" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "SmsEvent_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "SmsEvent_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "SmsJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SmsJob_dedupeKey_key" ON "SmsJob"("dedupeKey");
CREATE UNIQUE INDEX "SmsJob_provider_providerMessageId_key" ON "SmsJob"("provider","providerMessageId");
CREATE INDEX "SmsJob_status_nextAttemptAt_idx" ON "SmsJob"("status","nextAttemptAt");
CREATE INDEX "SmsJob_createdAt_id_idx" ON "SmsJob"("createdAt","id");
CREATE INDEX "SmsJob_orderId_idx" ON "SmsJob"("orderId");
CREATE UNIQUE INDEX "SmsEvent_jobId_providerEventId_key" ON "SmsEvent"("jobId","providerEventId");
CREATE INDEX "SmsEvent_jobId_createdAt_idx" ON "SmsEvent"("jobId","createdAt");
