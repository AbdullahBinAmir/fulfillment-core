import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  DailyOpsSummary,
  OpsSummaryReadRepository,
  TierRevenue,
  TopProduct,
} from './ops-summary-read.repository';

// Deliberately raw SQL, deliberately its own repository — this is exactly
// the escape hatch the build guide says never to bolt onto OrderRepository.
// The write side has no reason to know how to unnest jsonb line items.
@Injectable()
export class TypeOrmOpsSummaryReadRepository implements OpsSummaryReadRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async fetchSummary(date: string): Promise<DailyOpsSummary> {
    const revenueByTier: TierRevenue[] = await this.dataSource.query(
      `SELECT "customerTier" AS tier,
              COUNT(*)::int AS "ordersCount",
              COALESCE(SUM(total), 0)::float AS revenue
         FROM "order"
        WHERE "createdAt"::date = $1
        GROUP BY "customerTier"
        ORDER BY "customerTier"`,
      [date],
    );

    const topProducts: TopProduct[] = await this.dataSource.query(
      `SELECT item->>'productId' AS "productId",
              SUM((item->>'quantity')::int)::int AS "quantitySold"
         FROM "order", jsonb_array_elements(items) AS item
        WHERE "createdAt"::date = $1
        GROUP BY item->>'productId'
        ORDER BY "quantitySold" DESC
        LIMIT 5`,
      [date],
    );

    const ordersCount = revenueByTier.reduce(
      (sum, row) => sum + row.ordersCount,
      0,
    );

    return { date, ordersCount, revenueByTier, topProducts };
  }
}
