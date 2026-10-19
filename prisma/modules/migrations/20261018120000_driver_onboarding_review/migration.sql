-- AlterTable driver_documents: per-document review state
ALTER TABLE `driver_documents` ADD COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'pending';
ALTER TABLE `driver_documents` ADD COLUMN `rejection_reason` TEXT NULL;
UPDATE `driver_documents` SET `status` = 'approved' WHERE `is_verified` = 1;

-- Existing drivers stay active; only new signups go through review.
UPDATE `users` SET `status` = 'active' WHERE `user_type` = 'driver' AND `status` = 'pending';
