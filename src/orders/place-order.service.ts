import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryItem } from '../inventory/inventory-item.entity';
import { Order } from './order.entity';
import { PlaceOrderDto } from './place-order.dto';

@Injectable()
export class PlaceOrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(InventoryItem)
    private readonly inventoryRepository: Repository<InventoryItem>,
  ) {}

  async placeOrder(dto: PlaceOrderDto): Promise<Order> {
    let total = dto.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );

    // NAIVE: pricing logic inline, will need to become the growing switch
    // before Strategy + Factory (M3) gives it a real reason to move out.
    if (dto.customerTier === 'silver') {
      total *= 0.95;
    } else if (dto.customerTier === 'gold') {
      total *= 0.9;
    }

    const order = this.orderRepository.create({
      customerId: dto.customerId,
      customerTier: dto.customerTier,
      items: dto.items,
      total,
    });
    await this.orderRepository.save(order);

    // NAIVE: no shared transaction with the save above — if this throws,
    // the order row above is already committed. This is the bug M2 fixes.
    for (const item of dto.items) {
      const inventoryItem = await this.inventoryRepository.findOneBy({
        productId: item.productId,
      });

      if (!inventoryItem || inventoryItem.quantity < item.quantity) {
        throw new Error(`Insufficient stock for product ${item.productId}`);
      }

      inventoryItem.quantity -= item.quantity;
      await this.inventoryRepository.save(inventoryItem);
    }

    return order;
  }
}
