import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { NOTIFICATIONS_QUEUE } from './notifications.queue';
import { SendOrderConfirmationHandler } from './send-order-confirmation.handler';

// Producer side only, loaded by the main app (AppModule). Registering a
// queue here only creates a Queue client for .add() — it does NOT start a
// consuming Worker, so the API process never competes with the real worker
// process for jobs. The consumer lives in NotificationsWorkerModule instead,
// loaded only by WorkerModule/worker-main.ts — that split is what makes M8's
// memory/concurrency experiment measure one real worker, not two.
@Module({
  imports: [
    CqrsModule,
    BullModule.registerQueue({
      name: NOTIFICATIONS_QUEUE,
      // M8 Step 6: a transient provider failure shouldn't need a human to
      // notice and manually retry. 3 attempts, exponential backoff starting
      // at 1s (so 1s, then 2s) — enough to ride out a brief outage without
      // hammering a provider that's already struggling.
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      },
    }),
  ],
  providers: [SendOrderConfirmationHandler],
})
export class NotificationsModule {}
