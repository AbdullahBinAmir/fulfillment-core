import { GoldPricingStrategy } from './gold-pricing.strategy';

describe('GoldPricingStrategy', () => {
  it('applies a 10% discount to the subtotal', () => {
    const strategy = new GoldPricingStrategy();

    const total = strategy.calculate([
      { productId: 'a', quantity: 2, unitPrice: 10 },
    ]);

    expect(total).toBe(18);
  });
});
