import { Injectable, Logger } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Interval } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { OrderPlacedEvent } from '../orders/domain/order-placed.event';
import { OutboxMessageOrmEntity } from './infrastructure/outbox-message.orm-entity';

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 20;
const POLL_INTERVAL_MS = 5000;

// This closes ONE specific gap from ADR-006: an event surviving a crash
// between commit and publish. It does NOT retry a listener that fails on its
// own terms — @nestjs/cqrs's EventBus already catches and logs those (see
// ADR-006) without surfacing the failure back to publish()'s caller. What
// this dispatcher retries is failure to even attempt delivery: an unknown
// event type, or a transient DB error while marking a message processed.
@Injectable()
export class OutboxDispatcherService {
  private readonly logger = new Logger(OutboxDispatcherService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly eventBus: EventBus,
  ) {}

  @Interval(POLL_INTERVAL_MS)
  async dispatchPending(): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const pending = await manager
        .createQueryBuilder(OutboxMessageOrmEntity, 'message')
        .where('message.processedAt IS NULL')
        .andWhere('message.attempts < :maxAttempts', {
          maxAttempts: MAX_ATTEMPTS,
        })
        .orderBy('message.createdAt', 'ASC')
        .limit(BATCH_SIZE)
        .setLock('pessimistic_write')
        .getMany();

      for (const message of pending) {
        try {
          this.eventBus.publish(this.toDomainEvent(message));
          message.processedAt = new Date();
        } catch (error) {
          message.attempts += 1;
          message.lastError =
            error instanceof Error ? error.message : String(error);
          this.logger.warn(
            `Outbox message ${message.id} (${message.eventType}) failed attempt ${message.attempts}: ${message.lastError}`,
          );
        }
        await manager.save(OutboxMessageOrmEntity, message);
      }
    });
  }

  private toDomainEvent(message: OutboxMessageOrmEntity): OrderPlacedEvent {
    switch (message.eventType) {
      case 'OrderPlaced': {
        const payload = message.payload as {
          orderId: string;
          customerId: string;
          total: number;
        };
        return new OrderPlacedEvent(
          payload.orderId,
          payload.customerId,
          payload.total,
        );
      }
      default:
        throw new Error(`Unknown outbox event type "${message.eventType}"`);
    }
  }
}
