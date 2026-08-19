import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AnalyticsService } from './analytics.service';
import { TrackOrderPlacedHandler } from './track-order-placed.handler';

@Module({
  imports: [CqrsModule],
  providers: [AnalyticsService, TrackOrderPlacedHandler],
})
export class AnalyticsModule {}
