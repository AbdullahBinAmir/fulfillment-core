export const ORDERS_EXCHANGE = 'orders';

export function orderPlacedRoutingKey(region: string): string {
  return `order.${region}.placed`;
}
