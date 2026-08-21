import { InjectQueue } from '@nestjs/bullmq';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Queue } from 'bullmq';
import { OrderPlacedEvent } from '../orders/domain/order-placed.event';
import {
  NOTIFICATIONS_QUEUE,
  SEND_CONFIRMATION_JOB,
  SendConfirmationJobData,
} from './notifications.queue';

// M8: this handler is now only a producer — the actual send (and the M7
// idempotency check around it) moved to SendConfirmationProcessor, since
// that's where the real side effect happens. jobId = event.eventId gives a
// second, queue-level dedup on top of the ledger: BullMQ itself won't
// re-add a job with an id that's already waiting/active in the queue.
@EventsHandler(OrderPlacedEvent)
export class SendOrderConfirmationHandler implements IEventHandler<OrderPlacedEvent> {
  constructor(
    @InjectQueue(NOTIFICATIONS_QUEUE)
    private readonly notificationsQueue: Queue<SendConfirmationJobData>,
  ) {}

  async handle(event: OrderPlacedEvent): Promise<void> {
    await this.notificationsQueue.add(
      SEND_CONFIRMATION_JOB,
      { eventId: event.eventId, orderId: event.orderId },
      { jobId: event.eventId },
    );
  }
}
