# ADR-006: Events publish only after commit; failure isolation confirmed experimentally

**Context**
`OrderPlacedEvent` triggers independent side effects (email, analytics,
warehouse ping). Two questions needed answers, not assumptions: (1) when
should the event be published relative to the transaction, and (2) if one
listener throws, do the others still run?

**Decision**
`PlaceOrderUseCase` calls `eventBus.publish(...)` only after
`uow.transaction(...)` has resolved successfully — never from inside the
transaction callback. For question (2), a test was written that makes
`SendOrderConfirmationHandler` throw and asserts `TrackOrderPlacedHandler`
still runs, rather than trusting the framework's behavior by reading docs
alone.

**Consequence**
Publishing after commit means listeners never react to a write that could
still have been rolled back. The test confirmed `@nestjs/cqrs`'s `EventBus`
does isolate sibling handlers from each other's exceptions — but it only logs
the failure (`[EventBus] ERROR`), with no retry and no durability. That gap
is real, not hypothetical, and is intentionally deferred to M6's Outbox
pattern rather than patched here.
