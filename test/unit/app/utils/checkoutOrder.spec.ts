import { describe, it, expect } from 'vitest'
import { buildOrderCreateBody, classifyOrderError } from '~/utils/checkoutOrder'
import type { OrderCreateBodyContext } from '~/utils/checkoutOrder'
import { makeCountry } from '~~/test/fixtures/country'

/** Echoes the key, so a title names the translation it came from. */
const t = (key: string) => key

describe('classifyOrderError', () => {
  it('makes an expired stock hold the one retryable error', () => {
    expect(classifyOrderError({ error: { type: 'reservation_unavailable' }, detail: 'ignored' }, t)).toEqual({
      title: 'form.submit.error.reservation_expired',
      description: 'form.submit.error.reservation_expired_description',
      shouldRetry: true,
      addressStepErrors: [],
    })
  })

  /**
   * Each `OrderCreateErrorType`: its title, Django's `detail` when sent,
   * else the type's own description.
   */
  it.each([
    ['invalid_order_data', 'invalid_order_data', 'invalid_order_data_description'],
    ['payment_not_found', 'payment_verification', 'payment_verification_description'],
    ['payment_verification', 'payment_verification', 'payment_verification_description'],
    ['payment_amount_mismatch', 'payment_mismatch', 'payment_mismatch_description'],
    ['payment_currency_mismatch', 'payment_mismatch', 'payment_mismatch_description'],
    ['invalid_coupon', 'invalid_coupon', 'invalid_coupon_description'],
    ['invalid_gift_card', 'invalid_gift_card', 'invalid_gift_card_description'],
    ['insufficient_stock', 'insufficient_stock', 'insufficient_stock_description'],
  ])('classifies %s by its type, not by its text', (type, title, fallback) => {
    const withDetail = classifyOrderError({ error: { type }, detail: 'Από το Django.' }, t)
    const withoutDetail = classifyOrderError({ error: { type } }, t)

    expect(withDetail).toEqual({
      title: `form.submit.error.${title}`,
      description: 'Από το Django.',
      shouldRetry: false,
      addressStepErrors: [],
    })
    expect(withoutDetail.description).toBe(`form.submit.error.${fallback}`)
  })

  it.each([
    ['insufficient_stock', 'form.submit.error.insufficient_stock'],
    ['cart_invalid', 'form.submit.error.inventory'],
  ])('%s prefers the per-line cart messages over the detail', (type, title) => {
    const info = classifyOrderError({
      error: { type },
      detail: 'The cart cannot be checked out.',
      cart: ['Shirt: 1 left', 'Hat is gone'],
    }, t)

    expect(info.title).toBe(title)
    expect(info.description).toBe('Shirt: 1 left. Hat is gone')
  })

  it('shows cart_invalid\'s detail when no line message came, and nothing invented', () => {
    expect(classifyOrderError({ error: { type: 'cart_invalid' }, detail: 'Empty cart.' }, t).description).toBe('Empty cart.')
    expect(classifyOrderError({ error: { type: 'cart_invalid' } }, t).description).toBeUndefined()
  })

  it('reads an untyped cart field error as an inventory problem, whatever it says', () => {
    const info = classifyOrderError({ cart: ['Product has insufficient stock.'] }, t)

    expect(info).toMatchObject({ title: 'form.submit.error.inventory', description: 'Product has insufficient stock.' })
  })

  it('lists DRF field errors and hands the address-step ones back per input', () => {
    const info = classifyOrderError({
      zipcode: ['Enter a valid postcode.'],
      countryId: ['Select a valid country.'],
      boxnowLockerId: ['Locker ID required.'],
    }, t)

    expect(info.title).toBe('form.submit.error.invalid_order_data')
    expect(info.description).toBe([
      'zipcode: Enter a valid postcode.',
      'countryId: Select a valid country.',
      'boxnowLockerId: Locker ID required.',
    ].join('\n'))
    expect(info.addressStepErrors).toEqual([
      { name: 'zipcode', message: 'Enter a valid postcode.' },
      { name: 'country', message: 'Select a valid country.' },
    ])
  })

  it('falls back to the detail under the generic title', () => {
    expect(classifyOrderError({ detail: 'Something broke.' }, t)).toEqual({
      title: 'form.submit.error.general',
      description: 'Something broke.',
      shouldRetry: false,
      addressStepErrors: [],
    })
  })

  it.each([
    ['no body (a non-JSON 5xx)', undefined],
    ['an empty body', {}],
  ])('shows only the generic title for %s', (_case, body) => {
    expect(classifyOrderError(body, t)).toEqual({
      title: 'form.submit.error.general',
      description: undefined,
      shouldRetry: false,
      addressStepErrors: [],
    })
  })
})

describe('buildOrderCreateBody', () => {
  const form = (overrides: Record<string, unknown> = {}) => ({
    payWayId: 3,
    countryId: 1,
    regionId: 'ATT',
    firstName: 'Maria',
    lastName: 'Papadopoulou',
    email: 'maria@example.com',
    street: 'Ermou',
    streetNumber: '10',
    city: 'Athens',
    zipcode: ' 105  63 ',
    phone: '+306912345678',
    customerNotes: 'Ring twice',
    documentType: 'RECEIPT',
    billingVatId: '',
    billingCountry: '',
    shippingMethod: 'home_delivery',
    ...overrides,
  })

  const ctx = (overrides: Partial<OrderCreateBodyContext> = {}): OrderCreateBodyContext => ({
    selectedCountry: undefined,
    loyaltyDiscount: null,
    giftCards: [],
    meta: null,
    attribution: null,
    ...overrides,
  })

  it('sends a home-delivery receipt order with no provider code and no billing columns', () => {
    expect(buildOrderCreateBody(form(), ctx())).toEqual({
      payWayId: 3,
      countryId: 1,
      regionId: 'ATT',
      firstName: 'Maria',
      lastName: 'Papadopoulou',
      email: 'maria@example.com',
      street: 'Ermou',
      streetNumber: '10',
      city: 'Athens',
      zipcode: '105 63',
      phone: '+306912345678',
      customerNotes: 'Ring twice',
      documentType: 'RECEIPT',
      billingVatId: undefined,
      billingCountry: undefined,
      loyaltyPointsToRedeem: undefined,
      giftCardCodes: undefined,
      shippingProviderCode: undefined,
      shippingKind: 'home_delivery',
    })
  })

  it('drops company requisites a receipt order was left holding', () => {
    const body = buildOrderCreateBody(form({ billingCompanyName: 'ACME', billingStreet: 'Stadiou' }), ctx())

    expect(body).not.toHaveProperty('billingCompanyName')
    expect(body).not.toHaveProperty('billingStreet')
  })

  const INVOICE = {
    documentType: 'INVOICE',
    billingVatId: '094014201',
    billingCountry: 'GR',
    billingCompanyName: 'ACME AE',
    billingTaxOffice: 'Α Αθηνών',
    billingActivity: 'Retail',
    billingStreet: 'Stadiou',
    billingStreetNumber: '5',
    billingCity: 'Piraeus',
    billingZipcode: '185 31',
  }

  it('sends the separate invoice address when billing differs from delivery', () => {
    expect(buildOrderCreateBody(form({ ...INVOICE, billingSameAsShipping: false }), ctx())).toMatchObject({
      billingVatId: '094014201',
      billingCountry: 'GR',
      billingCompanyName: 'ACME AE',
      billingTaxOffice: 'Α Αθηνών',
      billingActivity: 'Retail',
      billingStreet: 'Stadiou',
      billingStreetNumber: '5',
      billingCity: 'Piraeus',
      billingZipcode: '185 31',
    })
  })

  it('copies the delivery address into the invoice when billing is the same', () => {
    expect(buildOrderCreateBody(form({ ...INVOICE, billingSameAsShipping: true }), ctx())).toMatchObject({
      billingCompanyName: 'ACME AE',
      billingStreet: 'Ermou',
      billingStreetNumber: '10',
      billingCity: 'Athens',
      // The form's value, as typed: Django normalises billing postcodes itself.
      billingZipcode: ' 105  63 ',
    })
  })

  it('sends blank invoice fields as absent, not as empty strings', () => {
    const body = buildOrderCreateBody(
      form({ documentType: 'INVOICE', billingSameAsShipping: false, billingCompanyName: '', billingCity: '' }),
      ctx(),
    )

    expect(body.billingCompanyName).toBeUndefined()
    expect(body.billingCity).toBeUndefined()
  })

  it.each([
    ['box_now_locker', { boxnowLockerId: 'L-42', boxnowCompartmentSize: 2 }, { shippingProviderCode: 'boxnow', boxnowLockerId: 'L-42', boxnowCompartmentSize: 2 }],
    ['acs_smartpoint', { acsStationExternalId: 'ACS-7', acsStationBranch: 'ATH' }, { shippingProviderCode: 'acs', acsStationExternalId: 'ACS-7', acsStationBranch: 'ATH' }],
  ])('lets the %s carrier add its own pickup-point fields', (shippingMethod, fields, expected) => {
    const body = buildOrderCreateBody(form({ shippingMethod, ...fields }), ctx())

    expect(body).toMatchObject({ shippingKind: 'pickup_point', ...expected })
  })

  it('redeems the loyalty points and every gift card the shopper applied', () => {
    const body = buildOrderCreateBody(form(), ctx({
      loyaltyDiscount: { points: 500 },
      giftCards: [{ code: 'GC-1' }, { code: 'GC-2' }],
    }))

    expect(body.loyaltyPointsToRedeem).toBe(500)
    expect(body.giftCardCodes).toEqual(['GC-1', 'GC-2'])
  })

  it('normalises a bare national number against the delivery country', () => {
    const greece = makeCountry()

    expect(buildOrderCreateBody(form({ phone: '6912345678' }), ctx({ selectedCountry: greece })).phone).toBe('+306912345678')
  })

  it('carries the Meta dedup ids and the landing attribution only when there are some', () => {
    const meta = { consent: { ads: true }, event_ids: { purchase: 'evt-1' } }
    const attribution = { utmSource: 'ig', landingPath: '/products/42' }

    expect(buildOrderCreateBody(form(), ctx({ meta, attribution }))).toMatchObject({ meta, attribution })
    const bare = buildOrderCreateBody(form(), ctx())
    expect(bare).not.toHaveProperty('meta')
    expect(bare).not.toHaveProperty('attribution')
  })
})
