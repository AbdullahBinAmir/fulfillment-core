import { randomUUID } from 'crypto';

export interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export class Order {
  constructor(
    public readonly id: string,
    public readonly customerId: string,
    public readonly customerTier: string,
    public readonly items: OrderItem[],
    public readonly total: number,
    public readonly createdAt: Date,
  ) {}

  static create(params: {
    customerId: string;
    customerTier: string;
    items: OrderItem[];
    total: number;
  }): Order {
    return new Order(
      randomUUID(),
      params.customerId,
      params.customerTier,
      params.items,
      params.total,
      new Date(),
    );
  }
}
