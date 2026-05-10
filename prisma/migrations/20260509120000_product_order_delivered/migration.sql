-- AlterTable: add DELIVERED to Product_orders.status enum (MySQL)
ALTER TABLE `Product_orders` MODIFY `status` ENUM('NEW', 'PENDING', 'ACCEPTED', 'REJECTED', 'DELIVERED') NOT NULL DEFAULT 'NEW';
