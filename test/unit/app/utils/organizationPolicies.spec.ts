import { describe, expect, it } from 'vitest'
import { merchantReturnPolicySchema, shippingServicesSchema } from '~/utils/organizationPolicies'

function entry(overrides: Partial<ShippingPolicyEntry> = {}): ShippingPolicyEntry {
  return {
    countryCode: 'GR',
    kind: 'home_delivery',
    providerCode: 'acs',
    providerName: 'ACS Courier',
    price: 2.99,
    currency: 'EUR',
    freeShippingThreshold: null,
    deliveryDaysMin: null,
    deliveryDaysMax: null,
    maxWeightGrams: null,
    ...overrides,
  }
}

describe('shippingServicesSchema', () => {
  it('is one service per carrier and kind, a locker as a collection point', () => {
    const services = shippingServicesSchema([
      entry({ kind: 'home_delivery' }),
      entry({ kind: 'pickup_point' }),
      entry({ kind: 'pickup_point', providerCode: 'boxnow', providerName: 'BOX NOW', price: 1.99 }),
    ])

    expect(services.map(s => [s.name, s.fulfillmentType])).toEqual([
      ['ACS Courier', 'https://schema.org/FulfillmentTypeDelivery'],
      ['ACS Courier', 'https://schema.org/FulfillmentTypeCollectionPoint'],
      ['BOX NOW', 'https://schema.org/FulfillmentTypeCollectionPoint'],
    ])
  })

  it('prices each country, and a free-shipping threshold as a second, zero-rate condition', () => {
    const [service] = shippingServicesSchema([
      entry({ countryCode: 'GR', freeShippingThreshold: 40 }),
      entry({ countryCode: 'CY', price: 9.5 }),
    ])

    expect(service!.shippingConditions.map(c => [
      c.shippingDestination.addressCountry,
      c.shippingRate.value,
      'orderValue' in c ? c.orderValue.minValue : null,
    ])).toEqual([
      ['GR', 2.99, null],
      ['GR', 0, 40],
      ['CY', 9.5, null],
    ])
  })

  it('states a transit time only from the delivery days the store recorded', () => {
    const [service] = shippingServicesSchema([
      entry({ countryCode: 'GR', deliveryDaysMin: 1, deliveryDaysMax: 3 }),
      entry({ countryCode: 'CY', deliveryDaysMin: null, deliveryDaysMax: 5 }),
      entry({ countryCode: 'BG' }),
    ])

    expect(service!.shippingConditions.map(c => c.transitTime?.duration)).toEqual([
      { '@type': 'QuantitativeValue', 'minValue': 1, 'maxValue': 3, 'unitCode': 'DAY' },
      { '@type': 'QuantitativeValue', 'minValue': 5, 'maxValue': 5, 'unitCode': 'DAY' },
      undefined,
    ])
  })

  it('is nothing for a store that ships with nothing', () => {
    expect(shippingServicesSchema([])).toEqual([])
  })
})

describe('merchantReturnPolicySchema', () => {
  it('links the store\'s own return policy page', () => {
    expect(merchantReturnPolicySchema('https://store.test/return-policy')).toEqual({
      '@type': 'MerchantReturnPolicy',
      'merchantReturnLink': 'https://store.test/return-policy',
    })
  })

  it('is nothing for a store without a published return policy', () => {
    expect(merchantReturnPolicySchema(undefined)).toBeUndefined()
  })
})
