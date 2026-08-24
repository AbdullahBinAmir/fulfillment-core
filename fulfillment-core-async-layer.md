# Fulfillment Core — Async & Messaging Layer

**What this is:** a direct extension of the Fulfillment Core project from Phases 01–02 (not a new project — reuse your existing `Orders`, `Inventory`, `Pricing` modules). This adds the async/messaging layer, sized so every Phase 03 concept has a genuine reason to exist: at-least-once delivery and idempotency, BullMQ, RabbitMQ, Kafka, and the Outbox pattern. Milestones continue where the Phase 01–02 guide left off (M6 onward).

If you haven't built M1–M4 from the original guide yet, do those first — this layer sits on top of `PlaceOrderUseCase`, which needs to already exist and already publish `OrderPlacedEvent` via the in-process `EventBus` from Lesson 02.04. That in-process version is what you're about to prove is unreliable, then replace.

---

## 1. Why extend instead of starting fresh

A brand-new toy queue project (a generic "job processor" with fake work) won't force you to feel the actual stakes of these patterns — that's exactly the trap flagged repeatedly in this phase: idempotency only feels necessary once you've seen a real double-charge, and the Outbox pattern only feels justified once you've watched a real notification silently vanish. Fulfillment Core already has real stakes baked in: `PlaceOrderUseCase` involves money (pricing), inventory (stock that can be double-reserved), and customer-facing notifications (emails that can be duplicated or lost). Reusing it means every failure you deliberately cause in this project is a failure that would actually matter in production, not a contrived example.

---

## 2. What you're adding, mapped to what already exists

```
Existing (Phases 01–02):
  PlaceOrderUseCase → UnitOfWork.transaction() → EventBus.publish(OrderPlacedEvent)
                                                        ↓
                                          in-process listeners (no delivery guarantee)

New (this phase):
  PlaceOrderUseCase → UnitOfWork.transaction() → writes to `outbox` table (same transaction)
                                                        ↓
                                              OutboxRelay (polls, publishes)
                                                        ↓
                        ┌───────────────────────────────┼───────────────────────────┐
                        ↓                                ↓                           ↓
                BullMQ: `notifications` queue    RabbitMQ: `orders` topic    Kafka: `order-events` topic
                (confirmation email —              exchange (fan-out to        (durable log — replay for
                 simple decoupled work)             Shipping/Analytics/         fraud-detection style
                                                     Fraud-Detection)            consumers, added later)
```

You're deliberately building **three** different messaging backends into one project, even though a real production system would likely pick one or two — the point here is comparative, hands-on proof of when each fits, not production minimalism. Each milestone below tells you exactly what to build and, critically, what specific failure to reproduce and fix — reading the pattern isn't the exercise; watching it break and then fixing it is.

---

## 3. Milestone M7 — Prove the in-process gap, then fix it with idempotency (Lesson 03.01)

**Build:** nothing new yet. Use your existing `PlaceOrderUseCase` and its in-process `EventBus` listeners from Phase 02.

**Break it on purpose:** add an artificial crash inside `SendConfirmationEmailHandler` — throw an error 50% of the time, simulating a flaky email provider. Place 20 orders. Count how many confirmation emails actually "sent" (log a line instead of really emailing) versus how many orders exist in the database.

**What you should observe:** roughly half your orders have no corresponding "email sent" log line, and there is no retry, no record of the failure, nothing — the event simply vanished the moment the handler threw. This is the empirical proof of the gap flagged since Lesson 02.04, not just a claim to take on faith.

**Fix, this milestone only:** don't reach for a real queue yet. Instead, wrap the handler's logic with the idempotency pattern from Lesson 03.01 — a `processedMessages` ledger keyed by a stable `eventId` you generate when `OrderPlacedEvent` is created (not per-listener-attempt). Manually re-invoke the handler for the same event twice and confirm the second call is a safe no-op.

**Acceptance test:** a test that publishes the same `OrderPlacedEvent` object twice to the handler and asserts `sendConfirmation` was actually called exactly once.

---

## 4. Milestone M8 — Move confirmation emails to BullMQ (Lesson 03.02)

**Build:** a real `notifications` BullMQ queue backed by Redis. Replace the in-process `SendConfirmationEmailHandler` with a producer (added inside `PlaceOrderUseCase`, for now — you'll move this into the outbox in M10) and a separate `Worker` process.

**Reasoning to write down before coding:** why BullMQ specifically for this job, and not RabbitMQ or Kafka? Confirmation email is single-purpose, single-consumer work — there's no need for multiple independent services to react to it, and no need to replay history. That's the BullMQ-shaped case from your lesson.

**Break it on purpose:** set `concurrency: 5` on your worker, and make `sendConfirmationEmail` deliberately slow (an artificial 2-second delay) and memory-heavy (allocate a large buffer per call, just to make the resource cost visible). Place 50 orders rapidly and watch what happens to your worker process's memory under load. Then deliberately misconfigure concurrency far too high (e.g. 200) and watch it degrade or crash.

**Fix:** calculate a defensible concurrency number the way Lesson 03.02's corrected Q1 did — actual per-job memory cost, divided into your container/process memory budget, with headroom. Set `attempts` and exponential `backoff`, then make `sendConfirmationEmail` throw on the first attempt only (simulate a transient failure) and confirm it succeeds on retry without your code doing anything extra.

**Acceptance test:** a test asserting a job requeued after a thrown error is retried with increasing delay (you can inspect this via BullMQ's job state/attemptsMade), and a load test (even a simple loop) confirming your worker doesn't exceed a memory ceiling you set for it.

---

## 5. Milestone M9 — Fan-out order events with RabbitMQ (Lesson 03.03)

**Build:** a `orders` topic exchange. Three independently-added consumers, each in their own module, simulating three separate teams' services:

- `shipping-service` — binds to `order.*.placed`
- `analytics-service` — binds to `order.#`
- `fraud-detection` — binds to `*.eu.placed` (simulate region in your routing key, e.g. `order.eu.placed` vs `order.us.placed`)

**Reasoning to write down:** why RabbitMQ here and not just adding more BullMQ queues? Because the *number of consumers is expected to grow*, and you want adding "fraud-detection" next quarter to require zero changes to `PlaceOrderUseCase` or to Shipping/Analytics — the routing pattern, not the producer, decides who receives what.

**Break it on purpose, twice:**
1. Publish `order.eu.placed.expedited` (add the extra segment deliberately) and confirm — exactly like the corrected Q1 in this lesson — that `shipping-service`'s `order.*.placed` binding silently fails to match it, with zero errors anywhere. Then fix the binding pattern to `order.*.placed.#` and confirm it now matches.
2. Kill the `shipping-service` consumer process mid-processing (add a delay and `process.exit()` partway through handling one message). Restart it and confirm only `shipping-service`'s copy of that message redelivers — `analytics-service` and `fraud-detection`, which already acked their independent copies, are unaffected.

**Acceptance test:** three consumers, one published message, three independent log lines proving three independent copies were received and acked separately.

---

## 6. Milestone M10 — Add Kafka for replayable order history (Lesson 03.04)

**Build:** an `order-events` Kafka topic with at least 3 partitions. Produce every order lifecycle event (`OrderPlaced`, `OrderPaid`, `OrderShipped`) keyed by `orderId`. Add one consumer group (`order-analytics`) with 2 consumer instances.

**Reasoning to write down:** why Kafka here specifically, alongside RabbitMQ, not instead of it? Because this is the one requirement in the whole project that's genuinely replay-shaped — "show me every event for this order, in order, even if the consumer reading them didn't exist yet when they happened" — which RabbitMQ's model can't do (a consumer that didn't exist at publish time never sees that message), and Kafka's retained log can.

**Break it on purpose:** produce `OrderPlaced`, `OrderPaid`, `OrderShipped` for the same `orderId` but **without a key** (or with different random keys) and confirm — by logging which partition each lands on — that they can land on different partitions, and that a consumer processing them out of order is now a real, reproducible possibility (build a small handler that would misbehave if it saw `OrderShipped` before `OrderPlaced`, and trigger that misbehavior). Then fix it by keying all three by `orderId` and confirm they always land on the same partition, in order.

**Acceptance test:** produce 10 orders' worth of 3 events each (30 total), correctly keyed, and assert programmatically that for every `orderId`, the consumer observed `OrderPlaced` before `OrderPaid` before `OrderShipped`.

---

## 7. Milestone M11 — Tie it together with the Outbox pattern (Lesson 03.05)

**Build:** an `outbox` table. Modify `PlaceOrderUseCase` to write to it *inside* the existing `UnitOfWork.transaction()` call from Phase 02 — this should feel like almost no new code, since the transaction machinery already exists. Build an `OutboxRelay` (`@Cron`, polling every few seconds) that reads unpublished rows and dispatches them to whichever of BullMQ/RabbitMQ/Kafka is appropriate per event type.

**Reasoning to write down:** this milestone should make you go back and edit M8–M10's producers — instead of `PlaceOrderUseCase` calling `emailQueue.add()` or `channel.publish()` directly, it should now only ever write to the outbox. The relay is the only thing that talks to the actual queues. Explain in your own words why this is strictly better than what M8–M10 had you build initially.

**Break it on purpose, twice:**
1. Kill the process running `PlaceOrderUseCase` (simulate a crash) *immediately after* the transaction commits but *before* the outbox insert would have been possible to skip — actually, construct this properly: make the outbox insert conditional on some flag, and temporarily set the flag to skip it, simulating "what if we'd published directly instead." Place an order, crash the process before an in-memory-only publish would have gone out, and confirm — with the outbox disabled — the notification is lost. Then re-enable the outbox insert and confirm the same crash no longer loses it, because the row is already durably committed.
2. Kill the `OutboxRelay` process between it calling `emailQueue.add()` successfully and its `UPDATE outbox SET published_at = ...` completing. Restart the relay and confirm it republishes the same row — a real, observed duplicate — and confirm your M8 idempotency handling (from the BullMQ worker side) absorbs the duplicate without a second real email being sent.

**Acceptance test:** a full end-to-end test — place an order, kill and restart the relay mid-flight, and assert exactly one email was actually sent (via your idempotency ledger) despite the outbox row being processed twice.

---

## 8. Testing strategy per pattern — what "done" looks like

| Pattern | Test that proves it's actually working |
|---|---|
| Idempotency (M7) | Same event handled twice → side effect fires exactly once |
| BullMQ retry/concurrency (M8) | Thrown error → job retries with backoff; memory stays under a set ceiling under load |
| RabbitMQ routing (M9) | One message → N independent copies to N bound queues; one consumer crash → only its own copy redelivers |
| Kafka ordering (M10) | Keyed events for the same entity always process in produced order; unkeyed events demonstrably can not |
| Outbox (M11) | Relay crash between publish and mark-published → row republishes → downstream idempotency absorbs the duplicate with zero real duplicate side effects |

If you can't write the test in this table for a given milestone, the concept isn't actually proven yet — go back before moving on, same rule as the Phase 01–02 guide.

---

## 9. Guardrails, pulled from this phase's actual corrections

- **Don't call the outbox relay synchronously.** Its reliability comes specifically from being an independent process that can crash and retry against durable state — inlining it reopens the exact gap it exists to close (M11's corrected Q1).
- **Don't size BullMQ concurrency by feel.** Calculate it from real per-job memory and the downstream dependency's actual limit, multiplied across every running worker process (M8).
- **Don't skip the `#` in a routing key pattern if you expect the schema to grow new segments.** A silently-dropped message with zero errors is worse than a crash (M9).
- **Don't produce related events without a shared key in Kafka**, if their relative order matters even slightly (M10).
- **Don't key idempotency ledgers on entity attributes (email, name) — key them on the specific event's own stable ID.** Attributes get reused and reassigned; event IDs don't (M7, and the corrected email-address question from Lesson 03.01).
- **Don't assume a partial index is optional once your outbox table has real volume.** You won't hit this until much later in the project's life, but note it now as a known future action (`CREATE INDEX ... WHERE published_at IS NULL`), covered fully in Phase 04.

---

## 10. What to bring back next

Same as before: bring the actual failures, not just the passing tests. The moment in M9 where a routing key silently drops a message, or the moment in M11 where you watch a real duplicate email attempt get absorbed by idempotency — those are the moments worth discussing in detail, because they're where "I understand the pattern" turns into "I've seen exactly how it fails and exactly how the fix holds."
