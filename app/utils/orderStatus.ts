import type { BadgeProps } from '@nuxt/ui'

/**
 * An order's way from placed to done, as Django's `OrderStatus` walks it
 * (`order/enum/status.py`, the transitions in `order/services.py`).
 * CANCELED, RETURNED and REFUNDED leave this path: they end an order
 * rather than move it along.
 */
export const ORDER_FLOW = [
  'PENDING',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'COMPLETED',
] as const satisfies readonly OrderStatus[]

/** How many steps of `ORDER_FLOW` the order has reached, 1–5; 0 off the path. */
export function orderStepsReached(status: OrderStatus | undefined): number {
  return status ? (ORDER_FLOW as readonly OrderStatus[]).indexOf(status) + 1 : 0
}

/**
 * True while an order is on its way to the shopper — placed but not yet
 * delivered. Its `estimatedDelivery` is a promise only then: once
 * delivered the date is history, and an order off the path (canceled,
 * returned, refunded) is not coming at all.
 */
export function awaitsDelivery(status: OrderStatus | undefined): boolean {
  const reached = orderStepsReached(status)
  return reached > 0 && reached < ORDER_FLOW.indexOf('DELIVERED') + 1
}

const STATUS_COLOR: Record<OrderStatus, NonNullable<BadgeProps['color']>> = {
  PENDING: 'warning',
  PROCESSING: 'warning',
  SHIPPED: 'secondary',
  DELIVERED: 'success',
  COMPLETED: 'success',
  CANCELED: 'error',
  RETURNED: 'neutral',
  REFUNDED: 'neutral',
}

/** The status pill's tint: waiting amber, on its way blue, done green, ended red or grey. */
export function orderStatusColor(status: OrderStatus | undefined): NonNullable<BadgeProps['color']> {
  return status ? STATUS_COLOR[status] : 'neutral'
}
