import { Module } from '@nestjs/common';
import { GoldPricingStrategy } from './gold-pricing.strategy';
import { PricingStrategyFactory } from './pricing-strategy.factory';
import { SilverPricingStrategy } from './silver-pricing.strategy';
import { StandardPricingStrategy } from './standard-pricing.strategy';

@Module({
  providers: [
    StandardPricingStrategy,
    SilverPricingStrategy,
    GoldPricingStrategy,
    PricingStrategyFactory,
  ],
  exports: [PricingStrategyFactory],
})
export class PricingModule {}
