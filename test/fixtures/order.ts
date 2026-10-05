import type { Order, OrderDetail, OrderItemDetail } from '~~/shared/openapi/types.gen'
import { FIXTURE_TIMESTAMP, fixtureUuid, makeProduct } from './product'

/**
 * An `OrderDetail` as Django serialises it, valid against the generated
 * `zOrderDetail` (proved by `test/unit/fixtures/order.spec.ts`).
 *
 * Defaults: order 1 for Maria Papadopoulou in Athens, retail, no items,
 * PENDING, unpaid, delivered outside any carrier (the legacy shape), earning
 * no points, a free cash-on-delivery pay way (id 1, like
 * `makePayWay()`), nothing discounted, no shipment, EUR. `uuid` follows
 * `id`. The money fields are all 0 and are NOT derived from each other —
 * a spec that shows totals sets the ones it reads.
 */
export function makeOrder(overrides: Partial<OrderDetail> = {}): OrderDetail {
  const id = overrides.id ?? 1

  return {
    id,
    user: null,
    country: 'GR',
    region: 'GR-I',
    street: 'Ερμού',
    streetNumber: '12',
    payWay: 1,
    status: 'PENDING',
    statusDisplay: 'Σε αναμονή',
    statusUpdatedAt: null,
    firstName: 'Maria',
    lastName: 'Papadopoulou',
    email: 'maria@example.com',
    zipcode: '10563',
    city: 'Αθήνα',
    phone: '+306912345678',
    paidAmount: 0,
    items: [],
    shippingPrice: 0,
    paymentMethodFee: 0,
    billingVatId: '',
    billingCountry: '',
    billingCompanyName: '',
    billingTaxOffice: '',
    billingActivity: '',
    billingStreet: '',
    billingStreetNumber: '',
    billingCity: '',
    billingZipcode: '',
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    uuid: fixtureUuid(6, id),
    totalPriceItems: 0,
    totalPriceExtra: 0,
    discountAmount: 0,
    loyaltyDiscount: 0,
    giftCardAmount: 0,
    fullAddress: 'Ερμού 12, 10563 Αθήνα',
    paymentStatus: 'PENDING',
    paymentStatusDisplay: 'Σε αναμονή',
    payWayKey: 'PAY_ON_DELIVERY',
    isOnlinePayment: false,
    isCollectedOnDelivery: true,
    deliveryMethod: { providerCode: null, providerName: null, kind: 'home_delivery' },
    canBeCanceled: true,
    isPaid: false,
    attribution: null,
    orderTimeline: [],
    pricingBreakdown: {},
    trackingDetails: null,
    hasInvoice: false,
    boxnowShipment: null,
    acsShipment: null,
    shipment: null,
    shipmentProviderCode: null,
    loyaltyPointsToEarn: 0,
    cancellation: null,
    appliedCouponCodes: [],
    customerFullName: 'Maria Papadopoulou',
    isCompleted: false,
    isCanceled: false,
    metaEventIds: {},
    currency: 'EUR',
    isFirstOrder: false,
    ...overrides,
  }
}

/**
 * An `Order` — the account order LIST serializer, a different shape
 * from `OrderDetail` (it carries the raw address and document fields,
 * none of the shipment, timeline or pricing ones) — valid against the
 * generated `zOrder` (proved by `test/unit/fixtures/order.spec.ts`).
 *
 * Defaults match `makeOrder()`: order 1, PENDING, unpaid, cancellable,
 * free cash on delivery, no items, all money 0 and not derived from
 * each other. `uuid` follows `id` (same scope as `makeOrder`, so an
 * order's list and detail rows agree).
 */
export function makeOrderListItem(overrides: Partial<Order> = {}): Order {
  const id = overrides.id ?? 1

  return {
    id,
    user: null,
    country: 'GR',
    region: 'GR-I',
    floor: '',
    locationType: '',
    street: 'Ερμού',
    streetNumber: '12',
    payWay: 1,
    status: 'PENDING',
    statusDisplay: 'Σε αναμονή',
    statusUpdatedAt: null,
    firstName: 'Maria',
    lastName: 'Papadopoulou',
    email: 'maria@example.com',
    zipcode: '10563',
    place: '',
    city: 'Αθήνα',
    phone: '+306912345678',
    customerNotes: '',
    paidAmount: 0,
    items: [],
    shippingPrice: 0,
    paymentMethodFee: 0,
    documentType: 'RECEIPT',
    billingVatId: '',
    billingCountry: '',
    billingCompanyName: '',
    billingTaxOffice: '',
    billingActivity: '',
    billingStreet: '',
    billingStreetNumber: '',
    billingCity: '',
    billingZipcode: '',
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    uuid: fixtureUuid(6, id),
    totalPriceItems: 0,
    totalPriceExtra: 0,
    discountAmount: 0,
    loyaltyDiscount: 0,
    giftCardAmount: 0,
    fullAddress: 'Ερμού 12, 10563 Αθήνα',
    paymentId: null,
    paymentStatus: 'PENDING',
    paymentStatusDisplay: 'Σε αναμονή',
    paymentMethod: '',
    payWayKey: 'PAY_ON_DELIVERY',
    isOnlinePayment: false,
    isCollectedOnDelivery: true,
    deliveryMethod: { providerCode: null, providerName: null, kind: 'home_delivery' },
    canBeCanceled: true,
    isPaid: false,
    attribution: null,
    ...overrides,
  }
}

/**
 * One line of an order (`OrderItemDetail`), valid against the generated
 * `zOrderItemDetail` (proved by `test/unit/fixtures/order.spec.ts`).
 *
 * Defaults: line 1 of order 1, one unit of `makeProduct({ id })` at
 * 20 EUR, nothing refunded. `uuid` follows `id`. Like the order's money
 * fields, the line's are NOT derived from each other.
 */
export function makeOrderItem(overrides: Partial<OrderItemDetail> = {}): OrderItemDetail {
  const id = overrides.id ?? 1

  return {
    id,
    uuid: fixtureUuid(27, id),
    order: 1,
    product: makeProduct({ id }),
    price: 20,
    quantity: 1,
    isRefunded: false,
    refundedQuantity: 0,
    netQuantity: 1,
    totalPrice: 20,
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    originalQuantity: null,
    refundedAmount: 0,
    netPrice: 20,
    sortOrder: null,
    notes: '',
    ...overrides,
  }
}
