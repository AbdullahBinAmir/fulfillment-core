import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryItemOrmEntity } from './infrastructure/inventory-item.orm-entity';

@Module({
  imports: [TypeOrmModule.forFeature([InventoryItemOrmEntity])],
})
export class InventoryModule {}
