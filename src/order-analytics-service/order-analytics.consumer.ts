import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import { ORDERS_EXCHANGE } from '../order-events/order-events.constants';

// A second, independent team's service — bound with `#` since analytics
// wants every order-lifecycle event, not just `placed`.
@Injectable()
export class OrderAnalyticsConsumer {
  private readonly logger = new Logger('order-analytics-service');

  @RabbitSubscribe({
    exchange: ORDERS_EXCHANGE,
    routingKey: 'order.#',
    queue: 'order-analytics-service',
    queueOptions: { durable: true },
  })
  handleOrderEvent(payload: { orderId: string }): void {
    this.logger.log(`received order ${payload.orderId}`);
  }
}
