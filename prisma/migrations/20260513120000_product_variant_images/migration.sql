-- Optional per-variant hero + gallery; client API resolves display* with product fallback.
ALTER TABLE `ProductVariant` ADD COLUMN `imageUrl` VARCHAR(512) NULL,
    ADD COLUMN `images` JSON NULL;
