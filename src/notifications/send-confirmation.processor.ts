import { Inject } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { IDEMPOTENCY_STORE } from '../idempotency/domain/idempotency-store.port';
import type { IdempotencyStore } from '../idempotency/domain/idempotency-store.port';
import { EmailService } from './email.service';
import {
  NOTIFICATIONS_QUEUE,
  SendConfirmationJobData,
} from './notifications.queue';

// The real send now happens here, not in SendOrderConfirmationHandler, so
// this is where the M7 idempotency check/record has to live — it has to sit
// right next to the side effect it's guarding, not upstream of it.
@Processor(NOTIFICATIONS_QUEUE)
export class SendConfirmationProcessor extends WorkerHost {
  constructor(
    private readonly email: EmailService,
    @Inject(IDEMPOTENCY_STORE) private readonly idempotency: IdempotencyStore,
  ) {
    super();
  }

  async process(job: Job<SendConfirmationJobData>): Promise<void> {
    const { eventId, orderId } = job.data;

    const alreadyHandled = await this.idempotency.hasProcessed(
      eventId,
      SendConfirmationProcessor.name,
    );
    if (alreadyHandled) {
      return;
    }

    await this.email.sendConfirmation(orderId);
    await this.idempotency.markProcessed(
      eventId,
      SendConfirmationProcessor.name,
    );
  }
}
