import { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProcessedMessageOrmEntity } from '../idempotency/infrastructure/processed-message.orm-entity';
import { OrderPlacedEvent } from '../orders/domain/order-placed.event';
import { EmailService } from './email.service';
import { NotificationsModule } from './notifications.module';
import { SendOrderConfirmationHandler } from './send-order-confirmation.handler';

// M7 acceptance test (build guide, Section 3): the same event delivered
// twice must only produce the side effect once. This is what actually makes
// at-least-once delivery (M8-M11's queues, and retries in general) safe.
describe('SendOrderConfirmationHandler (M7 — idempotency)', () => {
  let module: TestingModule;
  let app: INestApplication;
  let handler: SendOrderConfirmationHandler;
  let emailService: EmailService;
  let ledgerRepository: Repository<ProcessedMessageOrmEntity>;

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
        NotificationsModule,
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    handler = module.get(SendOrderConfirmationHandler);
    emailService = module.get(EmailService);
    ledgerRepository = module.get(
      getRepositoryToken(ProcessedMessageOrmEntity),
    );
  });

  afterEach(async () => {
    await ledgerRepository.delete({ eventId: 'm7-idempotency-event-1' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('sends the confirmation exactly once when the same event is handled twice', async () => {
    const sendConfirmationSpy = jest.spyOn(emailService, 'sendConfirmation');
    const event = new OrderPlacedEvent(
      'm7-idempotency-event-1',
      'order-1',
      'customer-1',
      42,
    );

    await handler.handle(event);
    await handler.handle(event);

    expect(sendConfirmationSpy).toHaveBeenCalledTimes(1);
    expect(sendConfirmationSpy).toHaveBeenCalledWith('order-1');

    const ledgerRow = await ledgerRepository.findOne({
      where: {
        eventId: 'm7-idempotency-event-1',
        handlerName: SendOrderConfirmationHandler.name,
      },
    });
    expect(ledgerRow).not.toBeNull();
  });
});
