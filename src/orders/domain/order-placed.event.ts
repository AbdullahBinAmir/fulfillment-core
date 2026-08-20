export class OrderPlacedEvent {
  constructor(
    // Stable identity for this event, generated once when the event is
    // created (see PlaceOrderUseCase) — NOT the outbox row's own id, and NOT
    // derived from orderId, since a later OrderPaid/OrderShipped event will
    // share the same orderId but must be a distinct idempotency key (M7).
    public readonly eventId: string,
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly total: number,
  ) {}
}
