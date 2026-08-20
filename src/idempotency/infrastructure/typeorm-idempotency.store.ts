import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IdempotencyStore } from '../domain/idempotency-store.port';
import { ProcessedMessageOrmEntity } from './processed-message.orm-entity';

@Injectable()
export class TypeOrmIdempotencyStore implements IdempotencyStore {
  constructor(
    @InjectRepository(ProcessedMessageOrmEntity)
    private readonly repository: Repository<ProcessedMessageOrmEntity>,
  ) {}

  async hasProcessed(eventId: string, handlerName: string): Promise<boolean> {
    const existing = await this.repository.findOne({
      where: { eventId, handlerName },
    });
    return existing !== null;
  }

  async markProcessed(eventId: string, handlerName: string): Promise<void> {
    // orIgnore (ON CONFLICT DO NOTHING against the (eventId, handlerName)
    // unique constraint) so a redelivered duplicate that races past
    // hasProcessed() can't crash on a unique-violation here.
    await this.repository
      .createQueryBuilder()
      .insert()
      .into(ProcessedMessageOrmEntity)
      .values({ eventId, handlerName })
      .orIgnore()
      .execute();
  }
}
