import { Injectable } from '@nestjs/common';
import { PricingItem } from './pricing-item';
import { PricingStrategy } from './pricing-strategy.interface';

@Injectable()
export class SilverPricingStrategy implements PricingStrategy {
  calculate(items: PricingItem[]): number {
    const subtotal = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    return subtotal * 0.95;
  }
}
