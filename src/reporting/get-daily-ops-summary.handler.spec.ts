import { GetDailyOpsSummaryHandler } from './get-daily-ops-summary.handler';
import { GetDailyOpsSummaryQuery } from './get-daily-ops-summary.query';
import {
  DailyOpsSummary,
  OpsSummaryReadRepository,
} from './ops-summary-read.repository';

// M4.5 acceptance test (build guide, Section 7): the query-side read model
// must be fully testable from a fake repository, without ever going through
// PlaceOrderUseCase or a real database.
describe('GetDailyOpsSummaryHandler', () => {
  it('returns whatever the read model provides', async () => {
    const fakeSummary: DailyOpsSummary = {
      date: '2026-08-19',
      ordersCount: 3,
      revenueByTier: [
        { tier: 'gold', ordersCount: 2, revenue: 54 },
        { tier: 'standard', ordersCount: 1, revenue: 25 },
      ],
      topProducts: [{ productId: 'widget-1', quantitySold: 7 }],
    };

    const fakeReadRepository: OpsSummaryReadRepository = {
      fetchSummary: jest.fn().mockResolvedValue(fakeSummary),
    };

    const handler = new GetDailyOpsSummaryHandler(fakeReadRepository);
    const result = await handler.execute(
      new GetDailyOpsSummaryQuery('2026-08-19'),
    );

    expect(result).toEqual(fakeSummary);
    expect(fakeReadRepository.fetchSummary).toHaveBeenCalledWith(
      '2026-08-19',
    );
  });
});
