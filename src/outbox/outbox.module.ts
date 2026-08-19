import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboxMessageOrmEntity } from './infrastructure/outbox-message.orm-entity';
import { OutboxDispatcherService } from './outbox-dispatcher.service';

@Module({
  imports: [TypeOrmModule.forFeature([OutboxMessageOrmEntity]), CqrsModule],
  providers: [OutboxDispatcherService],
})
export class OutboxModule {}
