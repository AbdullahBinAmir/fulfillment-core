import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OrderPlacedEvent } from '../orders/domain/order-placed.event';
import { EmailService } from './email.service';

@EventsHandler(OrderPlacedEvent)
export class SendOrderConfirmationHandler implements IEventHandler<OrderPlacedEvent> {
  constructor(private readonly email: EmailService) {}

  async handle(event: OrderPlacedEvent): Promise<void> {
    await this.email.sendConfirmation(event.orderId);
  }
}
