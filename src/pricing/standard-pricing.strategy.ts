import { Injectable } from '@nestjs/common';
import { PricingItem } from './pricing-item';
import { PricingStrategy } from './pricing-strategy.interface';

@Injectable()
export class StandardPricingStrategy implements PricingStrategy {
  calculate(items: PricingItem[]): number {
    return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  }
}
