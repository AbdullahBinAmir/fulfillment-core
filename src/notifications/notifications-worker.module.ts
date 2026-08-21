import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { IdempotencyModule } from '../idempotency/idempotency.module';
import { EmailService } from './email.service';
import { NOTIFICATIONS_QUEUE } from './notifications.queue';
import { SendConfirmationProcessor } from './send-confirmation.processor';

// Consumer side only — loaded exclusively by WorkerModule (worker-main.ts),
// a genuinely separate OS process from the main app. This is what M8's
// concurrency/memory experiment actually measures.
@Module({
  imports: [
    IdempotencyModule,
    BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE }),
  ],
  providers: [EmailService, SendConfirmationProcessor],
})
export class NotificationsWorkerModule {}
