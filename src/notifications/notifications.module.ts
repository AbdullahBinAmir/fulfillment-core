import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { IdempotencyModule } from '../idempotency/idempotency.module';
import { EmailService } from './email.service';
import { NOTIFICATIONS_QUEUE } from './notifications.queue';
import { SendConfirmationProcessor } from './send-confirmation.processor';
import { SendOrderConfirmationHandler } from './send-order-confirmation.handler';

@Module({
  imports: [
    CqrsModule,
    IdempotencyModule,
    BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE }),
  ],
  providers: [
    EmailService,
    SendOrderConfirmationHandler,
    SendConfirmationProcessor,
  ],
})
export class NotificationsModule {}
