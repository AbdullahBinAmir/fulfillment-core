import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { IdempotencyModule } from '../idempotency/idempotency.module';
import { EmailService } from './email.service';
import { SendOrderConfirmationHandler } from './send-order-confirmation.handler';

@Module({
  imports: [CqrsModule, IdempotencyModule],
  providers: [EmailService, SendOrderConfirmationHandler],
})
export class NotificationsModule {}
