import { Inject } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { IDEMPOTENCY_STORE } from '../idempotency/domain/idempotency-store.port';
import type { IdempotencyStore } from '../idempotency/domain/idempotency-store.port';
import { EmailService } from './email.service';
import {
  NOTIFICATIONS_QUEUE,
  SendConfirmationJobData,
} from './notifications.queue';

// M8 Steps 4-5 (build guide, Section 4): stand-in for what a real email
// provider call costs — template rendering plus an attachment-sized payload
// — so the concurrency number below is grounded in a measured per-job cost,
// not guessed. Gated behind an env var so routine test runs stay fast; set
// SIMULATE_PROVIDER_COST=true to reproduce the load experiment (measured:
// concurrency 5 -> ~124.5MB arrayBuffers for 50 jobs; concurrency 200 ->
// ~1004.5MB for the same 50 jobs, since with only 50 queued, 200 just meant
// "no throttling").
const SIMULATE_PROVIDER_COST = process.env.SIMULATE_PROVIDER_COST === 'true';
const SIMULATED_PROVIDER_LATENCY_MS = 2000;
const SIMULATED_PROVIDER_PAYLOAD_BYTES = 20 * 1024 * 1024; // ~20MB

// Step 6: a 512MB worker container, ~150MB reserved for baseline Node/Nest/
// BullMQ/pg overhead, leaves ~362MB for concurrent job payloads. At 20MB/job
// with a 1.5x safety margin — because Step 4 showed buffers from a finished
// job aren't reclaimed immediately, so bursts can stack instead of resetting
// — that's floor(362 / (20 * 1.5)) = 12.
const CONCURRENCY = 12;

// The real send now happens here, not in SendOrderConfirmationHandler, so
// this is where the M7 idempotency check/record has to live — it has to sit
// right next to the side effect it's guarding, not upstream of it.
@Processor(NOTIFICATIONS_QUEUE, { concurrency: CONCURRENCY })
export class SendConfirmationProcessor extends WorkerHost {
  constructor(
    private readonly email: EmailService,
    @Inject(IDEMPOTENCY_STORE) private readonly idempotency: IdempotencyStore,
  ) {
    super();
  }

  async process(job: Job<SendConfirmationJobData>): Promise<void> {
    const { eventId, orderId } = job.data;

    const alreadyHandled = await this.idempotency.hasProcessed(
      eventId,
      SendConfirmationProcessor.name,
    );
    if (alreadyHandled) {
      return;
    }

    if (SIMULATE_PROVIDER_COST) {
      const simulatedPayload = Buffer.alloc(
        SIMULATED_PROVIDER_PAYLOAD_BYTES,
        1,
      );
      await new Promise((resolve) =>
        setTimeout(resolve, SIMULATED_PROVIDER_LATENCY_MS),
      );
      simulatedPayload.fill(0);
    }

    await this.email.sendConfirmation(orderId);
    await this.idempotency.markProcessed(
      eventId,
      SendConfirmationProcessor.name,
    );
  }
}
