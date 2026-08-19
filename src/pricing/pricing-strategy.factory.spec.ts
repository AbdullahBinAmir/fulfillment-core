import { GoldPricingStrategy } from './gold-pricing.strategy';
import { PricingStrategyFactory } from './pricing-strategy.factory';
import { SilverPricingStrategy } from './silver-pricing.strategy';
import { StandardPricingStrategy } from './standard-pricing.strategy';

describe('PricingStrategyFactory', () => {
  const factory = new PricingStrategyFactory(
    new StandardPricingStrategy(),
    new SilverPricingStrategy(),
    new GoldPricingStrategy(),
  );

  it('resolves each known tier to its matching strategy', () => {
    expect(factory.getFor('standard')).toBeInstanceOf(StandardPricingStrategy);
    expect(factory.getFor('silver')).toBeInstanceOf(SilverPricingStrategy);
    expect(factory.getFor('gold')).toBeInstanceOf(GoldPricingStrategy);
  });

  it('throws instead of silently falling back on an unknown tier', () => {
    expect(() => factory.getFor('platinum')).toThrow(
      'No pricing strategy registered for tier "platinum"',
    );
  });
});
