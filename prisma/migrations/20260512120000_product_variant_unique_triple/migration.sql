-- Replace single-column unique on productId with (productId, sizeId, typeId).
-- InnoDB keeps FK `ProductVariant_productId_fkey` on `productId`; dropping the old unique
-- removes the only index on `productId` unless we add one first.

CREATE INDEX `ProductVariant_productId_idx` ON `ProductVariant`(`productId`);

DROP INDEX `ProductVariant_productId_key` ON `ProductVariant`;

CREATE UNIQUE INDEX `ProductVariant_productId_sizeId_typeId_key` ON `ProductVariant`(`productId`, `sizeId`, `typeId`);

DROP INDEX `ProductVariant_productId_idx` ON `ProductVariant`;
