import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PricingModule } from '../pricing/pricing.module';
import { PlaceOrderUseCase } from './application/place-order.use-case';
import { UNIT_OF_WORK } from './domain/unit-of-work.port';
import { OrderOrmEntity } from './infrastructure/order.orm-entity';
import { TypeOrmUnitOfWork } from './infrastructure/typeorm-unit-of-work';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderOrmEntity]),
    PricingModule,
    CqrsModule,
  ],
  providers: [
    PlaceOrderUseCase,
    { provide: UNIT_OF_WORK, useClass: TypeOrmUnitOfWork },
  ],
  exports: [PlaceOrderUseCase],
})
export class OrdersModule {}
