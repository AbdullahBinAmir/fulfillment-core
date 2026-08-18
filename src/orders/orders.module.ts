import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryModule } from '../inventory/inventory.module';
import { Order } from './order.entity';
import { PlaceOrderService } from './place-order.service';

@Module({
  imports: [TypeOrmModule.forFeature([Order]), InventoryModule],
  providers: [PlaceOrderService],
  exports: [PlaceOrderService],
})
export class OrdersModule {}
