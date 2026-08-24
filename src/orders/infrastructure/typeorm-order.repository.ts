import { EntityManager } from 'typeorm';
import { Order } from '../domain/order.entity';
import { OrderRepository } from '../domain/order-repository.port';
import { OrderOrmEntity } from './order.orm-entity';

// Constructed manually (not via Nest DI) because it must be bound to the
// EntityManager of one specific transaction — see TypeOrmUnitOfWork.
export class TypeOrmOrderRepository implements OrderRepository {
  constructor(private readonly manager: EntityManager) {}

  async findById(id: string): Promise<Order | null> {
    const row = await this.manager.findOneBy(OrderOrmEntity, { id });
    return row ? this.toDomain(row) : null;
  }

  async save(order: Order): Promise<void> {
    const row = this.manager.create(OrderOrmEntity, {
      id: order.id,
      customerId: order.customerId,
      customerTier: order.customerTier,
      region: order.region,
      items: order.items,
      total: order.total,
      createdAt: order.createdAt,
    });
    await this.manager.save(OrderOrmEntity, row);
  }

  private toDomain(row: OrderOrmEntity): Order {
    return new Order(
      row.id,
      row.customerId,
      row.customerTier,
      row.region,
      row.items,
      row.total,
      row.createdAt,
    );
  }
}
