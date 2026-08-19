import { Inject, Injectable } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { PricingStrategyFactory } from '../../pricing/pricing-strategy.factory';
import { Order } from '../domain/order.entity';
import { OrderPlacedEvent } from '../domain/order-placed.event';
import { UNIT_OF_WORK } from '../domain/unit-of-work.port';
import type { UnitOfWork } from '../domain/unit-of-work.port';
import { PlaceOrderCommand } from './place-order.command';

@Injectable()
export class PlaceOrderUseCase {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    private readonly pricingFactory: PricingStrategyFactory,
    private readonly eventBus: EventBus,
  ) {}

  async execute(cmd: PlaceOrderCommand): Promise<Order> {
    const total = this.pricingFactory
      .getFor(cmd.customerTier)
      .calculate(cmd.items);

    const order = await this.uow.transaction(async (ctx) => {
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

    // Published only after the transaction has committed — listeners must
    // never react to a write that could still have been rolled back.
    this.eventBus.publish(
      new OrderPlacedEvent(order.id, order.customerId, order.total),
    );

    return order;
  }
}
