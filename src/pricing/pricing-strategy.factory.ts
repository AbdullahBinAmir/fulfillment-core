import { Injectable } from '@nestjs/common';
import { GoldPricingStrategy } from './gold-pricing.strategy';
import { PricingStrategy } from './pricing-strategy.interface';
import { SilverPricingStrategy } from './silver-pricing.strategy';
import { StandardPricingStrategy } from './standard-pricing.strategy';

@Injectable()
export class PricingStrategyFactory {
  private readonly strategies: Map<string, PricingStrategy>;

  constructor(
    standard: StandardPricingStrategy,
    silver: SilverPricingStrategy,
    gold: GoldPricingStrategy,
  ) {
    this.strategies = new Map<string, PricingStrategy>([
      ['standard', standard],
      ['silver', silver],
      ['gold', gold],
    ]);
  }

  getFor(customerTier: string): PricingStrategy {
    const strategy = this.strategies.get(customerTier);
    if (!strategy) {
      throw new Error(
        `No pricing strategy registered for tier "${customerTier}"`,
      );
    }
    return strategy;
  }
}
