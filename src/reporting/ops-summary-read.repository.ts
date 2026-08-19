export interface TierRevenue {
  tier: string;
  ordersCount: number;
  revenue: number;
}

export interface TopProduct {
  productId: string;
  quantitySold: number;
}

export interface DailyOpsSummary {
  date: string;
  ordersCount: number;
  revenueByTier: TierRevenue[];
  topProducts: TopProduct[];
}

export const OPS_SUMMARY_READ_REPOSITORY = Symbol(
  'OPS_SUMMARY_READ_REPOSITORY',
);

export interface OpsSummaryReadRepository {
  fetchSummary(date: string): Promise<DailyOpsSummary>;
}
