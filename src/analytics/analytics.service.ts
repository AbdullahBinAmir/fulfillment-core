import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  async track(eventName: string, payload: unknown): Promise<void> {
    this.logger.log(`${eventName} ${JSON.stringify(payload)}`);
    return Promise.resolve();
  }
}
