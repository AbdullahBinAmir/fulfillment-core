import { randomUUID } from 'crypto';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderOrmEntity } from '../orders/infrastructure/order.orm-entity';
import { TypeOrmOpsSummaryReadRepository } from './typeorm-ops-summary-read.repository';

describe('TypeOrmOpsSummaryReadRepository', () => {
  let module: TestingModule;
  let repository: TypeOrmOpsSummaryReadRepository;
  let orderRepository: Repository<OrderOrmEntity>;

  const TODAY = new Date().toISOString().slice(0, 10);
  const PRODUCT_ID = 'reporting-test-widget';
  const CUSTOMER_A = 'reporting-test-customer-a';
  const CUSTOMER_B = 'reporting-test-customer-b';

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
        TypeOrmModule.forFeature([OrderOrmEntity]),
      ],
      providers: [TypeOrmOpsSummaryReadRepository],
    }).compile();

    repository = module.get(TypeOrmOpsSummaryReadRepository);
    orderRepository = module.get(getRepositoryToken(OrderOrmEntity));
  });

  afterAll(async () => {
    await orderRepository.delete({ customerId: CUSTOMER_A });
    await orderRepository.delete({ customerId: CUSTOMER_B });
    await module.close();
  });

  it('aggregates orders, revenue by tier, and top products for the given date', async () => {
    // Snapshot first, then assert on the delta — this DB can carry
    // unrelated rows from other days/customers, so we never assume it's empty.
    const before = await repository.fetchSummary(TODAY);

    await orderRepository.save([
      orderRepository.create({
        id: randomUUID(),
        customerId: CUSTOMER_A,
        customerTier: 'gold',
        region: 'eu',
        items: [{ productId: PRODUCT_ID, quantity: 3, unitPrice: 10 }],
        total: 27,
      }),
      orderRepository.create({
        id: randomUUID(),
        customerId: CUSTOMER_B,
        customerTier: 'standard',
        region: 'us',
        items: [{ productId: PRODUCT_ID, quantity: 2, unitPrice: 10 }],
        total: 20,
      }),
    ]);

    const after = await repository.fetchSummary(TODAY);

    expect(after.ordersCount).toBe(before.ordersCount + 2);

    const goldBefore = before.revenueByTier.find((row) => row.tier === 'gold');
    const goldAfter = after.revenueByTier.find((row) => row.tier === 'gold');
    expect(goldAfter?.ordersCount).toBe((goldBefore?.ordersCount ?? 0) + 1);
    expect(goldAfter?.revenue).toBeCloseTo((goldBefore?.revenue ?? 0) + 27);

    const standardBefore = before.revenueByTier.find(
      (row) => row.tier === 'standard',
    );
    const standardAfter = after.revenueByTier.find(
      (row) => row.tier === 'standard',
    );
    expect(standardAfter?.ordersCount).toBe(
      (standardBefore?.ordersCount ?? 0) + 1,
    );
    expect(standardAfter?.revenue).toBeCloseTo(
      (standardBefore?.revenue ?? 0) + 20,
    );

    const product = after.topProducts.find(
      (row) => row.productId === PRODUCT_ID,
    );
    expect(product?.quantitySold).toBe(5);
  });
});
