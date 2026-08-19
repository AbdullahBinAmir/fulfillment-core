import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryItemOrmEntity } from '../../inventory/infrastructure/inventory-item.orm-entity';
import { InventoryModule } from '../../inventory/inventory.module';
import { OrderOrmEntity } from '../infrastructure/order.orm-entity';
import { OrdersModule } from '../orders.module';
import { PlaceOrderUseCase } from './place-order.use-case';

// M1's bug-reproduction test, now pointed at the M2 (hexagonal + Unit of
// Work) implementation. Same invariant as before — a failed inventory
// reservation must leave zero trace of the order — but this time it's
// expected to PASS, because both writes now share one transaction.
describe('PlaceOrderUseCase (M2 — Unit of Work)', () => {
  let module: TestingModule;
  let placeOrderUseCase: PlaceOrderUseCase;
  let orderRepository: Repository<OrderOrmEntity>;
  let inventoryRepository: Repository<InventoryItemOrmEntity>;

  const TEST_PRODUCT_ID = 'test-widget-m2-uow';
  const TEST_CUSTOMER_ID = 'customer-m2-uow-test';

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            type: 'postgres',
            host: config.get<string>('DB_HOST'),
            port: config.get<number>('DB_PORT'),
            username: config.get<string>('DB_USERNAME'),
            password: config.get<string>('DB_PASSWORD'),
            database: config.get<string>('DB_DATABASE'),
            autoLoadEntities: true,
            synchronize: true,
          }),
        }),
        OrdersModule,
        InventoryModule,
      ],
    }).compile();

    placeOrderUseCase = module.get(PlaceOrderUseCase);
    orderRepository = module.get(getRepositoryToken(OrderOrmEntity));
    inventoryRepository = module.get(getRepositoryToken(InventoryItemOrmEntity));
  });

  afterEach(async () => {
    await orderRepository.delete({ customerId: TEST_CUSTOMER_ID });
    await inventoryRepository.delete({ productId: TEST_PRODUCT_ID });
  });

  afterAll(async () => {
    await module.close();
  });

  it('does not persist an order when inventory reservation fails', async () => {
    await inventoryRepository.save(
      inventoryRepository.create({ productId: TEST_PRODUCT_ID, quantity: 1 }),
    );

    await expect(
      placeOrderUseCase.execute({
        customerId: TEST_CUSTOMER_ID,
        customerTier: 'standard',
        items: [{ productId: TEST_PRODUCT_ID, quantity: 5, unitPrice: 10 }],
      }),
    ).rejects.toThrow('Insufficient stock');

    const persistedOrders = await orderRepository.find({
      where: { customerId: TEST_CUSTOMER_ID },
    });
    expect(persistedOrders).toHaveLength(0);

    const inventoryItem = await inventoryRepository.findOneBy({
      productId: TEST_PRODUCT_ID,
    });
    expect(inventoryItem?.quantity).toBe(1);
  });

  it('persists both the order and the reservation together on success', async () => {
    await inventoryRepository.save(
      inventoryRepository.create({ productId: TEST_PRODUCT_ID, quantity: 10 }),
    );

    const order = await placeOrderUseCase.execute({
      customerId: TEST_CUSTOMER_ID,
      customerTier: 'gold',
      items: [{ productId: TEST_PRODUCT_ID, quantity: 3, unitPrice: 10 }],
    });

    expect(order.total).toBe(27); // 30 * 0.9 gold discount

    const inventoryItem = await inventoryRepository.findOneBy({
      productId: TEST_PRODUCT_ID,
    });
    expect(inventoryItem?.quantity).toBe(7);
  });
});
