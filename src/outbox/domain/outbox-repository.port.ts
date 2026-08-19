export interface OutboxRepository {
  record(eventType: string, payload: unknown): Promise<void>;
}
