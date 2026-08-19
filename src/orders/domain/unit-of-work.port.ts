import { InventoryRepository } from '../../inventory/domain/inventory-repository.port';
import { OutboxRepository } from '../../outbox/domain/outbox-repository.port';
import { OrderRepository } from './order-repository.port';

export const UNIT_OF_WORK = Symbol('UNIT_OF_WORK');

export interface TransactionContext {
  orders: OrderRepository;
  inventory: InventoryRepository;
  outbox: OutboxRepository;
}

export interface UnitOfWork {
  transaction<T>(work: (ctx: TransactionContext) => Promise<T>): Promise<T>;
}
