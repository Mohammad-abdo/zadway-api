/*
  Warnings:

  - You are about to alter the column `last_location_update_at` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - You are about to alter the column `last_actived_at` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - You are about to alter the column `otp_expires_at` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - You are about to alter the column `last_rejection_at` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.

*/
-- AlterTable
ALTER TABLE `product_orders` MODIFY `status` ENUM('NEW', 'PENDING', 'ACCEPTED', 'PICKED_UP', 'ON_THE_WAY', 'REJECTED', 'DELIVERED', 'CANCELLED') NOT NULL DEFAULT 'NEW';

-- AlterTable
ALTER TABLE `users` MODIFY `last_location_update_at` TIMESTAMP NULL,
    MODIFY `last_actived_at` TIMESTAMP NULL,
    MODIFY `otp_expires_at` TIMESTAMP NULL,
    MODIFY `last_rejection_at` TIMESTAMP NULL;
