import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import { ORDERS_EXCHANGE } from '../order-events/order-events.constants';

// A third team's service, added without touching the publisher or the
// other two consumers — the whole point of M9. Bound narrowly: only EU
// orders, per some (fictional) EU-specific fraud rule.
@Injectable()
export class FraudDetectionConsumer {
  private readonly logger = new Logger('fraud-detection');

  @RabbitSubscribe({
    exchange: ORDERS_EXCHANGE,
    routingKey: '*.eu.placed',
    queue: 'fraud-detection',
    queueOptions: { durable: true },
  })
  handleEuOrderPlaced(payload: { orderId: string }): void {
    this.logger.log(`received EU order ${payload.orderId}`);
  }
}
