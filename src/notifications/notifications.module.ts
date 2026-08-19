import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { EmailService } from './email.service';
import { SendOrderConfirmationHandler } from './send-order-confirmation.handler';

@Module({
  imports: [CqrsModule],
  providers: [EmailService, SendOrderConfirmationHandler],
})
export class NotificationsModule {}
