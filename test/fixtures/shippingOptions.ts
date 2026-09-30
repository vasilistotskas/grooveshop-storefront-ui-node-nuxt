import type { ShippingOption } from '~~/shared/openapi/types.gen'

/**
 * A `ShippingOption` — one row of `/api/v1/shipping/options` — valid
 * against the generated `zShippingOption` (proved by
 * `test/unit/fixtures/shippingOptions.spec.ts`).
 *
 * Defaults: ACS home delivery in GR at 2,99 €, live, priority 10, no
 * weight cap, no pay ways. The named builders below are the rows a real
 * Greek store serves, in the priority order Django sorts them by
 * (`ShippingProvider.priority` ascending: BoxNow 5 first, ACS 10).
 */
export function makeShippingOption(overrides: Partial<ShippingOption> = {}): ShippingOption {
  return {
    providerCode: 'acs',
    providerName: 'ACS Courier',
    kind: 'home_delivery',
    price: 2.99,
    currency: 'EUR',
    liveMode: true,
    priority: 10,
    countryCode: 'GR',
    maxWeightGrams: null,
    exceedsMaxWeight: false,
    metadata: {},
    payWays: [],
    ...overrides,
  }
}

/** The BoxNow locker row (`kind: 'pickup_point'`, UI method `box_now_locker`). */
export function boxNowLockerOption(overrides: Partial<ShippingOption> = {}): ShippingOption {
  return makeShippingOption({
    providerCode: 'boxnow',
    providerName: 'BOX NOW',
    kind: 'pickup_point',
    priority: 5,
    ...overrides,
  })
}

/** The ACS home-delivery row (UI method `home_delivery`). */
export function acsHomeDeliveryOption(overrides: Partial<ShippingOption> = {}): ShippingOption {
  return makeShippingOption(overrides)
}

/** The ACS Smartpoint row (`kind: 'pickup_point'`, UI method `acs_smartpoint`). */
export function acsSmartpointOption(overrides: Partial<ShippingOption> = {}): ShippingOption {
  return makeShippingOption({ kind: 'pickup_point', priority: 15, ...overrides })
}
