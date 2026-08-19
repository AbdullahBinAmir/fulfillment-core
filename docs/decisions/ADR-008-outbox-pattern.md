# ADR-008: Outbox pattern to close the notification-durability gap (ADR-006)

**Context**
ADR-006 confirmed `@nestjs/cqrs`'s `EventBus` isolates sibling listeners from
each other's failures, but publishing was still an in-memory,
fire-and-forget call made right after the transaction committed. A process
crash in the window between commit and `publish()` would lose the event
permanently, with nothing to replay it.

**Decision**
Added an `outbox_message` table and an `OutboxRepository` port, threaded into
`UnitOfWork`'s `TransactionContext` alongside `orders` and `inventory`
(same manual-construction pattern as ADR-005). `PlaceOrderUseCase` now calls
`ctx.outbox.record('OrderPlaced', payload)` *inside* the same transaction as
the order and inventory writes, instead of calling `eventBus.publish()`
afterward. A separate `OutboxDispatcherService`, polling every 5 seconds via
`@Interval()`, reads unprocessed rows and publishes them to the real
`EventBus` — the same M4 listeners (`Notifications`, `Analytics`,
`Warehouse`) fire, completely unchanged.

**Consequence**
The event's existence is now atomic with the business write it describes: if
the transaction rolls back, no outbox row exists either (verified in the M2
use-case test); if the process crashes after commit but before dispatch, the
row is still there on restart and gets picked up on the next poll.

This does **not** retry an individual listener that fails on its own terms —
`EventBus.publish()` still catches and logs those per ADR-006, without
surfacing the failure back to the dispatcher. What it retries is failure to
even attempt delivery: an unrecognized event type, or a transient error while
marking a row processed (tracked via `attempts`/`lastError`, capped at 5
tries). Full per-listener retry would require bypassing `EventBus.publish()`
and invoking handlers directly — deferred until a concrete need for it shows
up, not built speculatively now.

A secondary finding: the dispatcher's poll query scans the whole
`outbox_message` table with no scoping, unlike every other test in this
project. Running the test suite with parallel workers against one shared
real Postgres instance created a genuine (if narrow) race between this
suite and the M2 UoW test. Fixed by pinning Jest to `maxWorkers: 1` in
`package.json` — correct for DB-integration tests against a single shared
instance, not a workaround to paper over a flaky test.
