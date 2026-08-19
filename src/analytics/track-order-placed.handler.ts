import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OrderPlacedEvent } from '../orders/domain/order-placed.event';
import { AnalyticsService } from './analytics.service';

@EventsHandler(OrderPlacedEvent)
export class TrackOrderPlacedHandler implements IEventHandler<OrderPlacedEvent> {
  constructor(private readonly analytics: AnalyticsService) {}

  async handle(event: OrderPlacedEvent): Promise<void> {
    await this.analytics.track('order_placed', event);
  }
}
