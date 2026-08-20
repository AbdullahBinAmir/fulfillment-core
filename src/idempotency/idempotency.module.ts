import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IDEMPOTENCY_STORE } from './domain/idempotency-store.port';
import { ProcessedMessageOrmEntity } from './infrastructure/processed-message.orm-entity';
import { TypeOrmIdempotencyStore } from './infrastructure/typeorm-idempotency.store';

@Module({
  imports: [TypeOrmModule.forFeature([ProcessedMessageOrmEntity])],
  providers: [
    { provide: IDEMPOTENCY_STORE, useClass: TypeOrmIdempotencyStore },
  ],
  exports: [IDEMPOTENCY_STORE],
})
export class IdempotencyModule {}
