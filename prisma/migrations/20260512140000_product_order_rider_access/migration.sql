ALTER TABLE `Product_orders`
  ADD COLUMN `rider_user_id` INTEGER NULL,
  ADD COLUMN `access_token` VARCHAR(64) NULL,
  ADD UNIQUE INDEX `Product_orders_access_token_key`(`access_token`),
  ADD INDEX `Product_orders_rider_user_id_status_idx`(`rider_user_id`, `status`);

ALTER TABLE `Product_orders`
  ADD CONSTRAINT `Product_orders_rider_user_id_fkey` FOREIGN KEY (`rider_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
