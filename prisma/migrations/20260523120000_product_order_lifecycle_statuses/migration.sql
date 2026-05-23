-- Extend product order lifecycle statuses for realtime + fulfillment flow
ALTER TABLE `Product_orders` MODIFY `status` ENUM(
  'NEW',
  'PENDING',
  'ACCEPTED',
  'PICKED_UP',
  'ON_THE_WAY',
  'REJECTED',
  'DELIVERED',
  'CANCELLED'
) NOT NULL DEFAULT 'NEW';
