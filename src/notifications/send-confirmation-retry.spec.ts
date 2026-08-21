import { getQueueToken } from '@nestjs/bullmq';
import { BullModule } from '@nestjs/bullmq';
import { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { ProcessedMessageOrmEntity } from '../idempotency/infrastructure/processed-message.orm-entity';
import { EmailService } from './email.service';
import { NotificationsWorkerModule } from './notifications-worker.module';
import {
  NOTIFICATIONS_QUEUE,
  SEND_CONFIRMATION_JOB,
} from './notifications.queue';
import { SendConfirmationProcessor } from './send-confirmation.processor';

// M8 Step 6 acceptance test (build guide, Section 4): a job that fails on
// its first attempt must retry with backoff and succeed — without any
// extra code, since that's the whole point of BullMQ's attempts/backoff
// options over hand-rolled retry logic.
describe('SendConfirmationProcessor (M8 — retry with backoff)', () => {
  let module: TestingModule;
  let app: INestApplication;
  let queue: Queue;
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
        NotificationsWorkerModule,
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    queue = module.get(getQueueToken(NOTIFICATIONS_QUEUE));
    emailService = module.get(EmailService);
    ledgerRepository = module.get(
      getRepositoryToken(ProcessedMessageOrmEntity),
    );
  });

  afterEach(async () => {
    // Redis is real and persists across runs — BullMQ's jobId dedup means a
    // leftover completed job with this id would silently short-circuit the
    // NEXT run's queue.add() without ever invoking the (freshly mocked)
    // EmailService, so the job itself has to go, not just the ledger row.
    const leftoverJob = await queue.getJob('m8-retry-event-1');
    await leftoverJob?.remove();
    await ledgerRepository.delete({ eventId: 'm8-retry-event-1' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('retries a job that fails on its first attempt and succeeds on the second', async () => {
    let calls = 0;
    jest.spyOn(emailService, 'sendConfirmation').mockImplementation(() => {
      calls += 1;
      if (calls === 1) {
        return Promise.reject(new Error('transient provider failure'));
      }
      return Promise.resolve();
    });

    const job = await queue.add(
      SEND_CONFIRMATION_JOB,
      { eventId: 'm8-retry-event-1', orderId: 'order-1' },
      {
        jobId: 'm8-retry-event-1',
        attempts: 2,
        backoff: { type: 'fixed', delay: 200 },
      },
    );

    const deadline = Date.now() + 5000;
    let current = job;
    let finished = await current.isCompleted();
    while (!finished && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      current = (await queue.getJob(job.id as string)) ?? current;
      finished = await current.isCompleted();
    }

    expect(finished).toBe(true);
    expect(calls).toBe(2);
    expect(current.attemptsMade).toBe(2);

    const ledgerRow = await ledgerRepository.findOne({
      where: {
        eventId: 'm8-retry-event-1',
        handlerName: SendConfirmationProcessor.name,
      },
    });
    expect(ledgerRow).not.toBeNull();
  }, 10000);
});
