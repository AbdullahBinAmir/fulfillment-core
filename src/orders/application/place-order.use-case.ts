import { Inject, Injectable } from '@nestjs/common';
import { Order } from '../domain/order.entity';
import { UNIT_OF_WORK } from '../domain/unit-of-work.port';
import type { UnitOfWork } from '../domain/unit-of-work.port';
import { PlaceOrderCommand } from './place-order.command';

@Injectable()
export class PlaceOrderUseCase {
  constructor(@Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork) {}

  async execute(cmd: PlaceOrderCommand): Promise<Order> {
    let total = cmd.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );

    // Still the naive inline tier check on purpose — Strategy + Factory
    // replaces this in M3, once a real second tier-growth pressure exists.
    if (cmd.customerTier === 'silver') {
      total *= 0.95;
    } else if (cmd.customerTier === 'gold') {
      total *= 0.9;
    }

    return this.uow.transaction(async (ctx) => {
      const order = Order.create({
        customerId: cmd.customerId,
        customerTier: cmd.customerTier,
        items: cmd.items,
        total,
      });

      await ctx.orders.save(order);
      await ctx.inventory.reserve(cmd.items);

      return order;
    });
  }
}
