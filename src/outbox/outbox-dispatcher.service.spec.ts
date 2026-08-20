import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule, EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OutboxMessageOrmEntity } from './infrastructure/outbox-message.orm-entity';
import { OutboxDispatcherService } from './outbox-dispatcher.service';

describe('OutboxDispatcherService', () => {
  let module: TestingModule;
  let dispatcher: OutboxDispatcherService;
  let outboxRepository: Repository<OutboxMessageOrmEntity>;
  let eventBus: EventBus;
  let createdIds: string[] = [];

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
        TypeOrmModule.forFeature([OutboxMessageOrmEntity]),
        CqrsModule,
      ],
      providers: [OutboxDispatcherService],
    }).compile();

    dispatcher = module.get(OutboxDispatcherService);
    outboxRepository = module.get(getRepositoryToken(OutboxMessageOrmEntity));
    eventBus = module.get(EventBus);
  });

  afterEach(async () => {
    if (createdIds.length) {
      await outboxRepository.delete(createdIds);
      createdIds = [];
    }
  });

  afterAll(async () => {
    await module.close();
  });

  it('publishes a pending message and marks it processed', async () => {
    const publishSpy = jest.spyOn(eventBus, 'publish');

    const message = await outboxRepository.save(
      outboxRepository.create({
        eventType: 'OrderPlaced',
        payload: {
          eventId: 'event-1',
          orderId: 'order-1',
          customerId: 'customer-1',
          total: 42,
        },
      }),
    );
    createdIds.push(message.id);

    await dispatcher.dispatchPending();

    expect(publishSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'order-1',
        customerId: 'customer-1',
        total: 42,
      }),
    );

    const reloaded = await outboxRepository.findOneBy({ id: message.id });
    expect(reloaded?.processedAt).not.toBeNull();
  });

  it('records an error and leaves an unrecognized event unprocessed for retry', async () => {
    const message = await outboxRepository.save(
      outboxRepository.create({ eventType: 'SomethingUnknown', payload: {} }),
    );
    createdIds.push(message.id);

    await dispatcher.dispatchPending();

    const reloaded = await outboxRepository.findOneBy({ id: message.id });
    expect(reloaded?.processedAt).toBeNull();
    expect(reloaded?.attempts).toBe(1);
    expect(reloaded?.lastError).toContain('Unknown outbox event type');
  });
});
