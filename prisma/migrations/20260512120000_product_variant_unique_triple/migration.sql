-- Drop old single-column unique on productId; allow multiple variants per product (size/type combos).
DROP INDEX `ProductVariant_productId_key` ON `ProductVariant`;

CREATE UNIQUE INDEX `ProductVariant_productId_sizeId_typeId_key` ON `ProductVariant`(`productId`, `sizeId`, `typeId`);
