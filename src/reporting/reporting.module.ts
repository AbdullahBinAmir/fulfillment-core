import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { GetDailyOpsSummaryHandler } from './get-daily-ops-summary.handler';
import { OPS_SUMMARY_READ_REPOSITORY } from './ops-summary-read.repository';
import { ReportingController } from './reporting.controller';
import { TypeOrmOpsSummaryReadRepository } from './typeorm-ops-summary-read.repository';

@Module({
  imports: [CqrsModule],
  controllers: [ReportingController],
  providers: [
    GetDailyOpsSummaryHandler,
    {
      provide: OPS_SUMMARY_READ_REPOSITORY,
      useClass: TypeOrmOpsSummaryReadRepository,
    },
  ],
})
export class ReportingModule {}
