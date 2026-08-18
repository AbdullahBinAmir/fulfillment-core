import { OrderItem } from './order.entity';

export interface PlaceOrderDto {
  customerId: string;
  customerTier: string;
  items: OrderItem[];
}
