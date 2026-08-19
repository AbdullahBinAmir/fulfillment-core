# ADR-005: Transaction-scoped repositories are constructed manually, not injected

**Context**
`TypeOrmOrderRepository` and `TypeOrmInventoryRepository` must each operate
against the `EntityManager` of one specific, currently-open transaction. That
`EntityManager` doesn't exist until `dataSource.transaction()` is called —
there's nothing for Nest's DI container to inject ahead of time.

**Decision**
`TypeOrmUnitOfWork.transaction()` calls `dataSource.transaction(async
(manager) => { ... })` and constructs both repositories inside that callback
with plain `new TypeOrmOrderRepository(manager)` / `new
TypeOrmInventoryRepository(manager)`, bypassing Nest's injector entirely for
these two objects.

**Consequence**
This is the one deliberate place in the codebase where a class from Orders'
infrastructure reaches directly into Inventory's infrastructure via a plain
import rather than through module-level DI wiring. It's called out explicitly
in the architecture diagram rather than left as an accidental-looking
exception to the rest of the DI-everywhere pattern.
