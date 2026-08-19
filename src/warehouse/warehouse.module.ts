import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PingWarehouseHandler } from './ping-warehouse.handler';
import { WarehouseService } from './warehouse.service';

@Module({
  imports: [CqrsModule],
  providers: [WarehouseService, PingWarehouseHandler],
})
export class WarehouseModule {}
