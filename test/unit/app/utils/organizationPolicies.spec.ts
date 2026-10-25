import { describe, expect, it } from 'vitest'
import { merchantReturnPolicySchema, returnFees, returnWindowDays, shippingServicesSchema } from '~/utils/organizationPolicies'

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
  const LINK = 'https://store.test/return-policy'
  const unstated = { link: LINK, windowDays: null, fees: null, countries: ['GR', 'CY'] }

  it('links the store\'s own return policy page while the store states no terms', () => {
    expect(merchantReturnPolicySchema(unstated)).toEqual({
      '@type': 'MerchantReturnPolicy',
      'merchantReturnLink': LINK,
    })
  })

  it('states the window and who pays, for every country the store ships to, beside the link', () => {
    expect(merchantReturnPolicySchema({ ...unstated, windowDays: 14, fees: 'customer' })).toEqual({
      '@type': 'MerchantReturnPolicy',
      'applicableCountry': ['GR', 'CY'],
      'returnPolicyCategory': 'https://schema.org/MerchantReturnFiniteReturnWindow',
      'merchantReturnDays': 14,
      'returnFees': 'https://schema.org/ReturnFeesCustomerResponsibility',
      'merchantReturnLink': LINK,
    })
  })

  it('states a free return as one', () => {
    expect(merchantReturnPolicySchema({ ...unstated, windowDays: 30, fees: 'free' })?.returnFees)
      .toBe('https://schema.org/FreeReturn')
  })

  it('says nothing of fees the store has not stated', () => {
    expect(merchantReturnPolicySchema({ ...unstated, windowDays: 14 })).not.toHaveProperty('returnFees')
  })

  it('states the terms without a page to link to', () => {
    expect(merchantReturnPolicySchema({ ...unstated, link: undefined, windowDays: 14 })).toEqual({
      '@type': 'MerchantReturnPolicy',
      'applicableCountry': ['GR', 'CY'],
      'returnPolicyCategory': 'https://schema.org/MerchantReturnFiniteReturnWindow',
      'merchantReturnDays': 14,
    })
  })

  it('states no terms for a store that ships nowhere: they name no country', () => {
    expect(merchantReturnPolicySchema({ ...unstated, windowDays: 14, countries: [] })).toEqual({
      '@type': 'MerchantReturnPolicy',
      'merchantReturnLink': LINK,
    })
  })

  it('is nothing for a store with neither a published page nor terms', () => {
    expect(merchantReturnPolicySchema({ ...unstated, link: undefined })).toBeUndefined()
  })
})

describe('returnWindowDays', () => {
  it('reads a whole number of days', () => {
    expect(returnWindowDays('14')).toBe(14)
  })

  it('is null for not stated (0), empty, or anything but a whole positive number', () => {
    expect(['0', '', ' ', '-3', '14.5', 'abc'].map(returnWindowDays)).toEqual([null, null, null, null, null, null])
  })
})

describe('returnFees', () => {
  it('reads the two terms a store can state', () => {
    expect(returnFees('free')).toBe('free')
    expect(returnFees('customer')).toBe('customer')
  })

  it('is null when the store has not said', () => {
    expect(returnFees('')).toBeNull()
    expect(returnFees('Free')).toBeNull()
  })
})
