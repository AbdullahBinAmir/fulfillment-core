import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryItem } from '../inventory/inventory-item.entity';
import { Order } from './order.entity';
import { OrdersModule } from './orders.module';
import { PlaceOrderService } from './place-order.service';

// bug-reproduction test.
// This encodes the CORRECT invariant, so it is expected to FAIL right now:
// PlaceOrderService has no shared transaction, so a failed inventory
// reservation still leaves the order committed. M2 (Unit of Work) is what
// makes this pass — re-run it unchanged once that lands.
describe('PlaceOrderService (M1 naive)', () => {
  let module: TestingModule;
  let placeOrderService: PlaceOrderService;
  let orderRepository: Repository<Order>;
  let inventoryRepository: Repository<InventoryItem>;

  const TEST_PRODUCT_ID = 'test-widget-m1-bug';
  const TEST_CUSTOMER_ID = 'customer-m1-bug-test';

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
      ],
    }).compile();

    placeOrderService = module.get(PlaceOrderService);
    orderRepository = module.get(getRepositoryToken(Order));
    inventoryRepository = module.get(getRepositoryToken(InventoryItem));
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

    const dto = {
      customerId: TEST_CUSTOMER_ID,
      customerTier: 'standard',
      items: [{ productId: TEST_PRODUCT_ID, quantity: 5, unitPrice: 10 }],
    };

    await expect(placeOrderService.placeOrder(dto)).rejects.toThrow(
      'Insufficient stock',
    );

    const persistedOrders = await orderRepository.find({
      where: { customerId: TEST_CUSTOMER_ID },
    });

    expect(persistedOrders).toHaveLength(0);
  });
});
