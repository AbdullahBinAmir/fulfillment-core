import { PricingItem } from './pricing-item';

export interface PricingStrategy {
  calculate(items: PricingItem[]): number;
}
