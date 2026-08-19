import { EntityManager } from 'typeorm';
import { InventoryItem } from '../domain/inventory-item.entity';
import {
  InventoryRepository,
  ReservationItem,
} from '../domain/inventory-repository.port';
import { InventoryItemOrmEntity } from './inventory-item.orm-entity';

// Constructed manually (not via Nest DI) because it must be bound to the
// EntityManager of one specific transaction — see TypeOrmUnitOfWork.
export class TypeOrmInventoryRepository implements InventoryRepository {
  constructor(private readonly manager: EntityManager) {}

  async reserve(items: ReservationItem[]): Promise<void> {
    for (const item of items) {
      const row = await this.manager.findOneBy(InventoryItemOrmEntity, {
        productId: item.productId,
      });

      if (!row) {
        throw new Error(`Unknown product ${item.productId}`);
      }

      // Read-modify-write within the transaction. No row locking yet
      // (SELECT ... FOR UPDATE) — fine for one writer, a known gap under
      // concurrent reservations. Worth an ADR if this project grows there.
      const inventoryItem = new InventoryItem(
        row.id,
        row.productId,
        row.quantity,
      );
      inventoryItem.reserve(item.quantity);

      await this.manager.update(
        InventoryItemOrmEntity,
        { id: row.id },
        { quantity: inventoryItem.quantity },
      );
    }
  }
}
