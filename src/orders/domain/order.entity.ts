import { randomUUID } from 'crypto';

export interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

// M9: a real field, not a simulated one — used to build the RabbitMQ
// routing key (order.<region>.placed) but meaningful independent of that.
export type Region = 'eu' | 'us';

export class Order {
  constructor(
    public readonly id: string,
    public readonly customerId: string,
    public readonly customerTier: string,
    public readonly region: Region,
    public readonly items: OrderItem[],
    public readonly total: number,
    public readonly createdAt: Date,
  ) {}

  static create(params: {
    customerId: string;
    customerTier: string;
    region: Region;
    items: OrderItem[];
    total: number;
  }): Order {
    return new Order(
      randomUUID(),
      params.customerId,
      params.customerTier,
      params.region,
      params.items,
      params.total,
      new Date(),
    );
  }
}
