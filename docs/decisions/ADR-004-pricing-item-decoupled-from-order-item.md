# ADR-004: Pricing gets its own line-item type, not Orders' `OrderItem`

**Context**
`PricingStrategy.calculate()` needs a list of line items (`productId`,
`quantity`, `unitPrice`) to compute a total. `OrderItem`, defined in Orders'
domain, already has exactly that shape. Importing it directly would work —
TypeScript's structural typing means `PlaceOrderCommand.items` already
satisfies it.

**Decision**
Defined a separate `PricingItem` interface inside the `pricing/` module
instead of importing `OrderItem` from `orders/domain/`. `PlaceOrderUseCase`
still passes `cmd.items` straight through — it type-checks because the shapes
match structurally, with no explicit conversion needed.

**Consequence**
Pricing and Orders can each evolve their line-item shape independently later
(e.g. if `OrderItem` grows an `orderId` reference or Pricing needs a field
Orders never will) without one bounded context's domain reaching into
another's. The cost is a small amount of duplication between two interfaces
that happen to look identical today.
