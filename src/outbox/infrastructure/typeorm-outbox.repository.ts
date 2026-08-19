import { EntityManager } from 'typeorm';
import { OutboxRepository } from '../domain/outbox-repository.port';
import { OutboxMessageOrmEntity } from './outbox-message.orm-entity';

// Same shape as TypeOrmOrderRepository/TypeOrmInventoryRepository (ADR-005):
// constructed manually, bound to one transaction's EntityManager, so the
// outbox write commits atomically with whatever business write triggered it.
export class TypeOrmOutboxRepository implements OutboxRepository {
  constructor(private readonly manager: EntityManager) {}

  async record(eventType: string, payload: unknown): Promise<void> {
    const row = this.manager.create(OutboxMessageOrmEntity, {
      eventType,
      payload: payload as Record<string, unknown>,
      processedAt: null,
      attempts: 0,
      lastError: null,
    });
    await this.manager.save(OutboxMessageOrmEntity, row);
  }
}
