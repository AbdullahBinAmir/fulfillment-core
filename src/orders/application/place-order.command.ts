import { OrderItem, Region } from '../domain/order.entity';

export interface PlaceOrderCommand {
  customerId: string;
  customerTier: string;
  region: Region;
  items: OrderItem[];
}
