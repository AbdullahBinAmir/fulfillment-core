import { StandardPricingStrategy } from './standard-pricing.strategy';

describe('StandardPricingStrategy', () => {
  it('charges full price with no discount', () => {
    const strategy = new StandardPricingStrategy();

    const total = strategy.calculate([
      { productId: 'a', quantity: 2, unitPrice: 10 },
      { productId: 'b', quantity: 1, unitPrice: 5 },
    ]);

    expect(total).toBe(25);
  });
});
