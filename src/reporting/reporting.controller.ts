import { Controller, Get, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GetDailyOpsSummaryQuery } from './get-daily-ops-summary.query';
import { DailyOpsSummary } from './ops-summary-read.repository';

@Controller('reporting')
export class ReportingController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('daily-summary')
  getDailySummary(@Query('date') date: string): Promise<DailyOpsSummary> {
    return this.queryBus.execute(new GetDailyOpsSummaryQuery(date));
  }
}
