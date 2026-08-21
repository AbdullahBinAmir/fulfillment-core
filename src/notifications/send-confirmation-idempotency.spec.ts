import { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { ProcessedMessageOrmEntity } from '../idempotency/infrastructure/processed-message.orm-entity';
import { EmailService } from './email.service';
import { NotificationsModule } from './notifications.module';
import { SendConfirmationJobData } from './notifications.queue';
import { SendConfirmationProcessor } from './send-confirmation.processor';

// M7 acceptance test (build guide, Section 3), re-anchored at the M8 worker:
// the real send moved from SendOrderConfirmationHandler (now just a BullMQ
// producer) to SendConfirmationProcessor, so this is where "same event
// twice -> side effect once" actually has to hold.
describe('SendConfirmationProcessor (M7 idempotency, on the M8 worker)', () => {
  let module: TestingModule;
  let app: INestApplication;
  let processor: SendConfirmationProcessor;
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
        BullModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            connection: {
              host: config.get<string>('REDIS_HOST'),
              port: config.get<number>('REDIS_PORT'),
            },
          }),
        }),
        NotificationsModule,
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    processor = module.get(SendConfirmationProcessor);
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

  it('sends the confirmation exactly once when the same job is processed twice', async () => {
    const sendConfirmationSpy = jest.spyOn(emailService, 'sendConfirmation');
    const job = {
      data: {
        eventId: 'm7-idempotency-event-1',
        orderId: 'order-1',
      },
    } as Job<SendConfirmationJobData>;

    await processor.process(job);
    await processor.process(job);

    expect(sendConfirmationSpy).toHaveBeenCalledTimes(1);
    expect(sendConfirmationSpy).toHaveBeenCalledWith('order-1');

    const ledgerRow = await ledgerRepository.findOne({
      where: {
        eventId: 'm7-idempotency-event-1',
        handlerName: SendConfirmationProcessor.name,
      },
    });
    expect(ledgerRow).not.toBeNull();
  });
});
