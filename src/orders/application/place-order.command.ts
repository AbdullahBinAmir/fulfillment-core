import { OrderItem } from '../domain/order.entity';

export interface PlaceOrderCommand {
  customerId: string;
  customerTier: string;
  items: OrderItem[];
}
