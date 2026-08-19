import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  sendConfirmation(orderId: string): Promise<void> {
    this.logger.log(`Order confirmation email sent for order ${orderId}`);
    return Promise.resolve();
  }
}
