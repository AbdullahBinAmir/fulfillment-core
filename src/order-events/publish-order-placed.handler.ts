import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OrderPlacedEvent } from '../orders/domain/order-placed.event';
import {
  ORDERS_EXCHANGE,
  orderPlacedRoutingKey,
} from './order-events.constants';

// M9: fans this event out to however many independent consumers exist —
// zero changes here are needed as shipping/analytics/fraud-detection get
// added, since the routing key + exchange bindings decide who receives it,
// not this publisher. Runs alongside the M8 BullMQ producer, not instead
// of it — email delivery and cross-team fan-out are separate concerns.
@EventsHandler(OrderPlacedEvent)
export class PublishOrderPlacedHandler implements IEventHandler<OrderPlacedEvent> {
  constructor(private readonly amqpConnection: AmqpConnection) {}

  async handle(event: OrderPlacedEvent): Promise<void> {
    const regionValue: unknown = event.region;
    if (typeof regionValue !== 'string') {
      throw new TypeError('OrderPlacedEvent.region must be a string');
    }

    await this.amqpConnection.publish(
      ORDERS_EXCHANGE,
      orderPlacedRoutingKey(regionValue),
      {
        eventId: event.eventId,
        orderId: event.orderId,
        customerId: event.customerId,
        region: regionValue,
        total: event.total,
      },
    );
  }
}
