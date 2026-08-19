# ADR-003: Why Saga is deferred to M5, not built alongside its own lesson

**Context**
Inventory (and eventually Shipping) currently live in-process, sharing
Orders' database. Saga exists to coordinate a business transaction across
*separate* services with *separate* databases, where a single ACID
transaction is no longer possible.

**Decision**
Use Unit of Work until a real service boundary exists. Do not build
`PlaceOrderSaga` now — there is no cross-database problem for it to solve
yet, and building it early would be infrastructure for a problem this
project doesn't have.

**Consequence**
Revisit this ADR the day Inventory (or Shipping) gets its own deployment and
its own database — that event is the trigger, not a calendar date or a lesson
number. Until then, Unit of Work is the correct tool, not a lesser
placeholder for Saga.
