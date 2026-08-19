# ADR-001: Why Unit of Work over per-repository saves

**Context**
Placing an order writes to both `orders` and `inventory`. Those writes must
succeed or fail together — the M1 naive version proved what happens when they
don't: a failed inventory reservation left a fully-formed order row behind.

**Decision**
Introduce a `UnitOfWork` port. `PlaceOrderUseCase` calls
`uow.transaction(work)`, and the concrete `TypeOrmUnitOfWork` opens one
Postgres transaction, builds an `OrderRepository` and `InventoryRepository`
bound to that transaction's `EntityManager`, and passes both into `work` as a
single `TransactionContext`.

**Consequence**
Inventory cannot have its own independent transaction boundary within an
order-placing flow — enforced by construction, since the only way to reach
Inventory's repository during order placement is through the context handed
to `work`. If a mid-transaction failure occurs, the whole transaction rolls
back, undoing every write made inside it, not just the one that failed.
