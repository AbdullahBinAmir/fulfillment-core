import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import { ORDERS_EXCHANGE } from '../order-events/order-events.constants';

// Simulates a separate team's service, independently bound to the `orders`
// exchange — adding this consumer required zero changes to the publisher.
//
// M9 break-it #1: `order.*.placed` silently missed `order.eu.placed.expedited`
// — a routing key that gained one extra segment matched zero errors, zero
// warnings, nothing. Fixed with a trailing `#` so a growing key schema keeps
// matching instead of silently falling through.
@Injectable()
export class ShippingConsumer {
  private readonly logger = new Logger('shipping-service');

  @RabbitSubscribe({
    exchange: ORDERS_EXCHANGE,
    routingKey: 'order.*.placed.#',
    queue: 'shipping-service',
    queueOptions: { durable: true },
  })
  handleOrderPlaced(payload: { orderId: string }): void {
    this.logger.log(`received order ${payload.orderId}`);
  }
}
