import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class WarehouseService {
  private readonly logger = new Logger(WarehouseService.name);

  async pingForOrder(orderId: string): Promise<void> {
    this.logger.log(`Warehouse pinged to prepare order ${orderId}`);
    return Promise.resolve();
  }
}
