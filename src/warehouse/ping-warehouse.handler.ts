import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OrderPlacedEvent } from '../orders/domain/order-placed.event';
import { WarehouseService } from './warehouse.service';

@EventsHandler(OrderPlacedEvent)
export class PingWarehouseHandler implements IEventHandler<OrderPlacedEvent> {
  constructor(private readonly warehouse: WarehouseService) {}

  async handle(event: OrderPlacedEvent): Promise<void> {
    await this.warehouse.pingForOrder(event.orderId);
  }
}
