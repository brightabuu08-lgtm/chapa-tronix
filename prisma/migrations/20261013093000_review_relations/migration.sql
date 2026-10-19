-- NOT VALID preserves historical orphan records while enforcing integrity on new writes.
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
CREATE INDEX "Category_parentId_active_idx" ON "Category"("parentId",active);
CREATE INDEX "Variant_productId_active_idx" ON "Variant"("productId",active);
CREATE INDEX "OrderItem_productId_orderId_idx" ON "OrderItem"("productId","orderId");
CREATE INDEX "OrderItem_variantId_idx" ON "OrderItem"("variantId");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Review_productId_approved_createdAt_idx" ON "Review"("productId",approved,"createdAt");
