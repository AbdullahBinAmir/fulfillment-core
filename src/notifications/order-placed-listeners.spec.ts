import { getQueueToken } from '@nestjs/bullmq';
import { INestApplication } from '@nestjs/common';
import { CqrsModule, EventBus } from '@nestjs/cqrs';
import { Test } from '@nestjs/testing';
import { AnalyticsService } from '../analytics/analytics.service';
import { TrackOrderPlacedHandler } from '../analytics/track-order-placed.handler';
import { OrderPlacedEvent } from '../orders/domain/order-placed.event';
import { NOTIFICATIONS_QUEUE } from './notifications.queue';
import { SendOrderConfirmationHandler } from './send-order-confirmation.handler';

// M4 acceptance test (build guide, Section 7): one listener throwing must
// never stop a sibling listener from running. Since M8, SendOrderConfirmation
// Handler only enqueues a BullMQ job rather than calling EmailService
// directly, so the failure mode that stands in for "this listener's own work
// blew up" is now the queue add() call rejecting (e.g. Redis unreachable).
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
          provide: getQueueToken(NOTIFICATIONS_QUEUE),
          useValue: {
            add: jest.fn().mockRejectedValue(new Error('Redis unreachable')),
          },
        },
        TrackOrderPlacedHandler,
        { provide: AnalyticsService, useValue: { track: trackSpy } },
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
