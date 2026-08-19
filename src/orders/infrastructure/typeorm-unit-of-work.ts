import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TypeOrmInventoryRepository } from '../../inventory/infrastructure/typeorm-inventory.repository';
import { TypeOrmOutboxRepository } from '../../outbox/infrastructure/typeorm-outbox.repository';
import { TransactionContext, UnitOfWork } from '../domain/unit-of-work.port';
import { TypeOrmOrderRepository } from './typeorm-order.repository';

@Injectable()
export class TypeOrmUnitOfWork implements UnitOfWork {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  transaction<T>(work: (ctx: TransactionContext) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(async (manager) => {
      const ctx: TransactionContext = {
        orders: new TypeOrmOrderRepository(manager),
        inventory: new TypeOrmInventoryRepository(manager),
        outbox: new TypeOrmOutboxRepository(manager),
      };
      return work(ctx);
    });
  }
}
