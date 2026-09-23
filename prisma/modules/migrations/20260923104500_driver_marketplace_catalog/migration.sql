-- AlterTable Category: marketplace ownership + subcategory tree
ALTER TABLE `Category` ADD COLUMN `owner_driver_id` INTEGER NULL;
ALTER TABLE `Category` ADD COLUMN `parent_id` INTEGER NULL;
CREATE INDEX `Category_owner_driver_id_idx` ON `Category`(`owner_driver_id`);
CREATE INDEX `Category_parent_id_idx` ON `Category`(`parent_id`);
ALTER TABLE `Category` ADD CONSTRAINT `Category_owner_driver_id_fkey` FOREIGN KEY (`owner_driver_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Category` ADD CONSTRAINT `Category_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable Product: marketplace ownership
ALTER TABLE `Product` ADD COLUMN `owner_driver_id` INTEGER NULL;
CREATE INDEX `Product_owner_driver_id_idx` ON `Product`(`owner_driver_id`);
CREATE INDEX `Product_categoryId_idx` ON `Product`(`categoryId`);
ALTER TABLE `Product` ADD CONSTRAINT `Product_owner_driver_id_fkey` FOREIGN KEY (`owner_driver_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
