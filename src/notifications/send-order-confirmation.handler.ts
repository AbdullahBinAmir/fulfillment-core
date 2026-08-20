import { Inject, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { IDEMPOTENCY_STORE } from '../idempotency/domain/idempotency-store.port';
import type { IdempotencyStore } from '../idempotency/domain/idempotency-store.port';
import { OrderPlacedEvent } from '../orders/domain/order-placed.event';
import { EmailService } from './email.service';

@EventsHandler(OrderPlacedEvent)
export class SendOrderConfirmationHandler implements IEventHandler<OrderPlacedEvent> {
  private readonly logger = new Logger(SendOrderConfirmationHandler.name);

  constructor(
    private readonly email: EmailService,
    @Inject(IDEMPOTENCY_STORE) private readonly idempotency: IdempotencyStore,
  ) {}

  async handle(event: OrderPlacedEvent): Promise<void> {
    const alreadyHandled = await this.idempotency.hasProcessed(
      event.eventId,
      SendOrderConfirmationHandler.name,
    );
    if (alreadyHandled) {
      this.logger.log(`Skipping duplicate delivery of event ${event.eventId}`);
      return;
    }

    await this.email.sendConfirmation(event.orderId);
    await this.idempotency.markProcessed(
      event.eventId,
      SendOrderConfirmationHandler.name,
    );
  }
}
