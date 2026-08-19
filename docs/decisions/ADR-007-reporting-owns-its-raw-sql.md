# ADR-007: Reporting gets its own raw-SQL repository

**Context**
The ops dashboard's "top products" needs quantities aggregated across the
`jsonb` line items stored on each `order` row — a query shape
(`jsonb_array_elements`, `GROUP BY`, cross-order aggregation) that has no
reasonable equivalent as a TypeORM entity method, and no business reason to
exist on the write side at all.

**Decision**
Built `TypeOrmOpsSummaryReadRepository` as its own class in `reporting/`,
running hand-written SQL directly against the `DataSource`. It does not
extend, wrap, or call into `TypeOrmOrderRepository`.

**Consequence**
Raw SQL in this codebase lives in exactly one, explicitly-named place. If
`TypeOrmOrderRepository` (the write-side repository) ever grows a
`findWithRawSql`-style escape hatch instead of this pattern being reused for
future reporting needs, that's a regression against this decision, not a
convenient shortcut.
