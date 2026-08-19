import { SilverPricingStrategy } from './silver-pricing.strategy';

describe('SilverPricingStrategy', () => {
  it('applies a 5% discount to the subtotal', () => {
    const strategy = new SilverPricingStrategy();

    const total = strategy.calculate([
      { productId: 'a', quantity: 2, unitPrice: 10 },
    ]);

    expect(total).toBe(19);
  });
});
