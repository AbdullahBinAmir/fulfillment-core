# ADR-002: Why Strategy + Factory over a tier switch, from day one

**Context**
Pricing differs by customer tier (`standard`, `silver`, `gold` today), and
tiers are expected to grow — this isn't a hypothetical, it's the same
"branches that keep growing over time" signal the Strategy pattern exists
for.

**Decision**
One class per tier (`StandardPricingStrategy`, `SilverPricingStrategy`,
`GoldPricingStrategy`), each implementing `PricingStrategy`.
`PricingStrategyFactory` is the single place allowed to branch on tier name,
resolving via an internal `Map`. Unknown tiers throw — no silent fallback to
a default price.

**Consequence**
A new tier costs one new strategy file plus one new `Map` entry in the
factory, with zero edits to `PlaceOrderUseCase`. If a second `if (tier ===
...)` ever appears outside the factory, that's a signal the discipline
slipped.
