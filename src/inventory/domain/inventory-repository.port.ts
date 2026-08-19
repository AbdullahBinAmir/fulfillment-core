export interface ReservationItem {
  productId: string;
  quantity: number;
}

export interface InventoryRepository {
  reserve(items: ReservationItem[]): Promise<void>;
}
