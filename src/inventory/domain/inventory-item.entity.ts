export class InsufficientStockError extends Error {
  constructor(productId: string) {
    super(`Insufficient stock for product ${productId}`);
    this.name = 'InsufficientStockError';
  }
}

export class InventoryItem {
  constructor(
    public readonly id: string,
    public readonly productId: string,
    private _quantity: number,
  ) {}

  get quantity(): number {
    return this._quantity;
  }

  reserve(amount: number): void {
    if (this._quantity < amount) {
      throw new InsufficientStockError(this.productId);
    }
    this._quantity -= amount;
  }
}
