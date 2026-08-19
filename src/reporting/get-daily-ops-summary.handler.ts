import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetDailyOpsSummaryQuery } from './get-daily-ops-summary.query';
import {
  DailyOpsSummary,
  OPS_SUMMARY_READ_REPOSITORY,
} from './ops-summary-read.repository';
import type { OpsSummaryReadRepository } from './ops-summary-read.repository';

@QueryHandler(GetDailyOpsSummaryQuery)
export class GetDailyOpsSummaryHandler implements IQueryHandler<GetDailyOpsSummaryQuery> {
  constructor(
    @Inject(OPS_SUMMARY_READ_REPOSITORY)
    private readonly readModel: OpsSummaryReadRepository,
  ) {}

  execute(query: GetDailyOpsSummaryQuery): Promise<DailyOpsSummary> {
    return this.readModel.fetchSummary(query.date);
  }
}
