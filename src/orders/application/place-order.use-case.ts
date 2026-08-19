import { Inject, Injectable } from '@nestjs/common';
import { PricingStrategyFactory } from '../../pricing/pricing-strategy.factory';
import { Order } from '../domain/order.entity';
import { UNIT_OF_WORK } from '../domain/unit-of-work.port';
import type { UnitOfWork } from '../domain/unit-of-work.port';
import { PlaceOrderCommand } from './place-order.command';

@Injectable()
export class PlaceOrderUseCase {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    private readonly pricingFactory: PricingStrategyFactory,
  ) {}

  async execute(cmd: PlaceOrderCommand): Promise<Order> {
    const total = this.pricingFactory
      .getFor(cmd.customerTier)
      .calculate(cmd.items);

    return this.uow.transaction(async (ctx) => {
      const order = Order.create({
        customerId: cmd.customerId,
        customerTier: cmd.customerTier,
        items: cmd.items,
        total,
      });

      await ctx.orders.save(order);
      await ctx.inventory.reserve(cmd.items);

      // Recorded in the SAME transaction as the writes above — the event's
      // durability no longer depends on the process staying alive between
      // commit and an in-memory publish() call (ADR-006's gap).
      await ctx.outbox.record('OrderPlaced', {
        orderId: order.id,
        customerId: order.customerId,
        total: order.total,
      });

      return order;
    });
  }
}
