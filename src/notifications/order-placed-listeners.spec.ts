import { INestApplication } from '@nestjs/common';
import { CqrsModule, EventBus } from '@nestjs/cqrs';
import { Test } from '@nestjs/testing';
import { AnalyticsService } from '../analytics/analytics.service';
import { TrackOrderPlacedHandler } from '../analytics/track-order-placed.handler';
import { IDEMPOTENCY_STORE } from '../idempotency/domain/idempotency-store.port';
import { OrderPlacedEvent } from '../orders/domain/order-placed.event';
import { EmailService } from './email.service';
import { SendOrderConfirmationHandler } from './send-order-confirmation.handler';

// M4 acceptance test (build guide, Section 7): one listener throwing must
// never stop a sibling listener from running.
describe('OrderPlacedEvent listeners (M4 — Domain Events)', () => {
  let app: INestApplication;

  afterEach(async () => {
    await app?.close();
  });

  it('lets a sibling listener run even when one listener throws', async () => {
    const trackSpy = jest.fn().mockResolvedValue(undefined);

    const moduleRef = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [
        SendOrderConfirmationHandler,
        {
          provide: EmailService,
          useValue: {
            sendConfirmation: jest
              .fn()
              .mockRejectedValue(new Error('SMTP down')),
          },
        },
        TrackOrderPlacedHandler,
        { provide: AnalyticsService, useValue: { track: trackSpy } },
        {
          provide: IDEMPOTENCY_STORE,
          useValue: {
            hasProcessed: jest.fn().mockResolvedValue(false),
            markProcessed: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    const eventBus = app.get(EventBus);
    eventBus.publish(
      new OrderPlacedEvent('event-1', 'order-1', 'customer-1', 42),
    );

    // Handlers run async off the publish() call — flush the microtask/macrotask
    // queue so both have had a chance to run before asserting.
    await new Promise((resolve) => setImmediate(resolve));

    expect(trackSpy).toHaveBeenCalledWith(
      'order_placed',
      expect.objectContaining({ orderId: 'order-1' }),
    );
  });
});
