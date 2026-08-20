export const IDEMPOTENCY_STORE = Symbol('IDEMPOTENCY_STORE');

// Keyed on (eventId, handlerName) rather than eventId alone, since more than
// one handler can legitimately process the same event (e.g. notifications +
// analytics) — a global-by-eventId lock would let one handler's completion
// silently block another's first attempt.
export interface IdempotencyStore {
  hasProcessed(eventId: string, handlerName: string): Promise<boolean>;
  markProcessed(eventId: string, handlerName: string): Promise<void>;
}
