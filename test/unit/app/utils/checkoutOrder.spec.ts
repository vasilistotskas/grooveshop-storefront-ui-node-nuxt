import { describe, it, expect } from 'vitest'
import { acceptedQuoteChange, acceptedQuoteOf, billingSharesDelivery, buildOrderCreateBody, CHECKOUT_STEP, classifyOrderError, describeCartChange, describeTotalChange, describeTotalToConfirm, failedStatusOf, placeOrderAt, quoteRequestOf, refusedResponseOf, rejectionSettlesAttempt, sameExpectedTotal, setDocumentType } from '~/utils/checkoutOrder'
import type { OrderCreateBodyContext } from '~/utils/checkoutOrder'
import { PICKUP_POINT_CHECK_UNAVAILABLE } from '~~/shared/constants/orderRefusals'
import { CART_DIGEST, makeCheckoutQuote, unpricedQuote } from '~~/test/fixtures/checkoutQuote'
import { makeCountry } from '~~/test/fixtures/country'

/** Echoes the key and its params, so a text names the translation it came from. */
const t = (key: string, params?: Record<string, unknown>) => params ? `${key} ${JSON.stringify(params)}` : key
/** Formats like the page would, so a text shows which amount it names. */
const n = (value: number, format: string) => `${format}:${value.toFixed(2)}`

describe('classifyOrderError', () => {
  it('makes an expired stock hold the one retryable error', () => {
    expect(classifyOrderError({ error: { type: 'reservation_unavailable' }, detail: 'ignored' }, t, n)).toEqual({
      title: 'form.submit.error.reservation_expired',
      description: 'form.submit.error.reservation_expired_description',
      shouldRetry: true,
      stepErrors: {},
      quoteChanged: false,
    })
  })

  // Django's idempotency middleware, while the same key is still being
  // processed: its English `detail` must not reach the shopper.
  it('tells the shopper an order with this key is already being placed', () => {
    expect(classifyOrderError({ detail: 'A duplicate request is already in progress.', code: 'idempotency_in_flight' }, t, n)).toEqual({
      title: 'form.submit.error.order_in_progress',
      description: 'form.submit.error.order_in_progress_description',
      shouldRetry: false,
      stepErrors: {},
      quoteChanged: false,
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
    const withDetail = classifyOrderError({ error: { type }, detail: 'Από το Django.' }, t, n)
    const withoutDetail = classifyOrderError({ error: { type } }, t, n)

    expect(withDetail).toEqual({
      title: `form.submit.error.${title}`,
      description: 'Από το Django.',
      shouldRetry: false,
      stepErrors: {},
      quoteChanged: false,
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
    }, t, n)

    expect(info.title).toBe(title)
    expect(info.description).toBe('Shirt: 1 left. Hat is gone')
  })

  it('shows cart_invalid\'s detail when no line message came, and nothing invented', () => {
    expect(classifyOrderError({ error: { type: 'cart_invalid' }, detail: 'Empty cart.' }, t, n).description).toBe('Empty cart.')
    expect(classifyOrderError({ error: { type: 'cart_invalid' } }, t, n).description).toBeUndefined()
  })

  it('reads an untyped cart field error as an inventory problem, whatever it says', () => {
    const info = classifyOrderError({ cart: ['Product has insufficient stock.'] }, t, n)

    expect(info).toMatchObject({ title: 'form.submit.error.inventory', description: 'Product has insufficient stock.' })
  })

  // Django's body for a serializer error (`core/api/exception_handler.py`):
  // the field keys DRF gave, plus `code` and `fields`. Its own refusal of a
  // street number that is a postcode lands under that input.
  it('reads Django\'s field errors from `fields` and hands the delivery-step ones back per input', () => {
    const message = 'This looks like a postcode. Enter the street number here and the postcode in the postcode field.'
    const info = classifyOrderError({
      streetNumber: [message],
      code: 'street_number_is_postcode',
      fields: { streetNumber: [{ message, code: 'street_number_is_postcode' }] },
    }, t, n)

    expect(info).toEqual({
      title: 'form.submit.error.invalid_order_data',
      description: `streetNumber: ${message}`,
      shouldRetry: false,
      stepErrors: { [CHECKOUT_STEP.delivery]: [{ name: 'streetNumber', message }] },
      quoteChanged: false,
    })
  })

  it('puts a street line Django could not split under the street input', () => {
    const message = 'Add the street number after the street name, for example Ermou 12, or enter it in the street number field.'
    const info = classifyOrderError({
      street: [message],
      code: 'street_number_missing',
      fields: { street: [{ message, code: 'street_number_missing' }] },
    }, t, n)

    expect(info.stepErrors).toEqual({ [CHECKOUT_STEP.delivery]: [{ name: 'street', message }] })
  })

  it('lists DRF field errors and hands each back to the step that shows it', () => {
    const info = classifyOrderError({
      zipcode: ['Enter a valid postcode.'],
      countryId: ['Select a valid country.'],
      billingFoo: ['Unknown.'],
    }, t, n)

    expect(info.title).toBe('form.submit.error.invalid_order_data')
    expect(info.description).toBe([
      'zipcode: Enter a valid postcode.',
      'countryId: Select a valid country.',
      'billingFoo: Unknown.',
    ].join('\n'))
    expect(info.stepErrors).toEqual({
      [CHECKOUT_STEP.details]: [{ name: 'country', message: 'Select a valid country.' }],
      [CHECKOUT_STEP.delivery]: [{ name: 'zipcode', message: 'Enter a valid postcode.' }],
    })
  })

  // Django refuses the point a pickup order names (#767) on the carrier's
  // own field: the delivery step's picker shows it.
  it.each([
    ['pickup_point_unknown', 'boxnowLockerId', 'boxnowLockerId'],
    ['pickup_point_too_small', 'boxnowLockerId', 'boxnowLockerId'],
    ['pickup_point_in_another_country', 'acsStationExternalId', 'acsStationExternalId'],
    ['pickup_point_required', 'acsStationBranch', 'acsStationExternalId'],
  ])('tells a %s refusal on %s in the storefront\'s words, under the picker and in the alert', (code, field, name) => {
    const message = 'This pickup point is not available.'
    const info = classifyOrderError({ [field]: [message], code, fields: { [field]: [{ message, code }] } }, t, n)

    expect(info).toMatchObject({
      title: 'form.submit.error.pickup_point_refused',
      description: `form.submit.error.${code}`,
      stepErrors: { [CHECKOUT_STEP.delivery]: [{ name, message: `form.submit.error.${code}` }] },
    })
  })

  // The 503 when the carrier's catalogue could not be asked: the point is
  // not judged, so the shopper tries again with it.
  it('tells the shopper to try again when the pickup point could not be checked', () => {
    expect(classifyOrderError({
      detail: 'The pickup point cannot be checked right now. Try again in a moment.',
      code: PICKUP_POINT_CHECK_UNAVAILABLE,
    }, t, n)).toEqual({
      title: 'form.submit.error.pickup_point_check_unavailable',
      description: 'form.submit.error.pickup_point_check_unavailable_description',
      shouldRetry: false,
      stepErrors: {},
      quoteChanged: false,
    })
  })

  it('falls back to the detail under the generic title', () => {
    expect(classifyOrderError({ detail: 'Something broke.' }, t, n)).toEqual({
      title: 'form.submit.error.general',
      description: 'Something broke.',
      shouldRetry: false,
      stepErrors: {},
      quoteChanged: false,
    })
  })

  // Django's 409 when the order's expectedTotal is not what it priced:
  // its error.type is invalid_order_data, so the code is what tells it
  // apart.
  it('tells the shopper the new total a changed-total refusal carries', () => {
    const info = classifyOrderError({
      detail: 'The order total changed.',
      code: 'total_changed',
      error: { type: 'invalid_order_data', quote: makeCheckoutQuote({ amountDue: 71.4 }) },
    }, t, n)

    expect(info).toEqual({
      title: 'form.submit.error.total_changed',
      description: 'form.submit.error.total_changed_description {"total":"currency:71.40"}',
      shouldRetry: false,
      stepErrors: {},
      quoteChanged: true,
    })
  })

  // Django's 409 when the order's expectedCartDigest is not the cart's:
  // told by its code as total_changed is, with the quote of the cart now.
  it('tells the shopper the cart changed, with the amount due its refusal carries', () => {
    const info = classifyOrderError({
      detail: 'Your cart has changed since its total was shown.',
      code: 'cart_changed',
      error: { type: 'invalid_order_data', quote: makeCheckoutQuote({ amountDue: 63, cartDigest: 'digest-now' }) },
    }, t, n)

    expect(info).toEqual({
      title: 'form.submit.error.cart_changed',
      description: 'form.submit.error.cart_changed_description {"total":"currency:63.00"}',
      shouldRetry: false,
      stepErrors: {},
      quoteChanged: true,
    })
  })

  it('asks for a review of the cart when the changed-cart refusal carries no readable quote', () => {
    const info = classifyOrderError({ code: 'cart_changed', error: { type: 'invalid_order_data' } }, t, n)

    expect(info).toMatchObject({ description: 'form.submit.error.cart_changed_review', quoteChanged: true })
  })

  it('asks for a review when the changed-total refusal carries no readable quote', () => {
    const info = classifyOrderError({ code: 'total_changed', error: { type: 'invalid_order_data' } }, t, n)

    expect(info).toMatchObject({ description: 'form.submit.error.total_changed_review', quoteChanged: true })
  })

  it.each([
    ['no body (a non-JSON 5xx)', undefined],
    ['an empty body', {}],
  ])('shows only the generic title for %s', (_case, body) => {
    expect(classifyOrderError(body, t, n)).toEqual({
      title: 'form.submit.error.general',
      description: undefined,
      shouldRetry: false,
      stepErrors: {},
      quoteChanged: false,
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
    termsAccepted: true,
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
      termsAccepted: true,
      loyaltyPointsToRedeem: undefined,
      giftCardCodes: undefined,
      shippingProviderCode: undefined,
      shippingKind: 'home_delivery',
    })
  })

  it('sends the terms consent as the shopper left it, for Django to record', () => {
    expect(buildOrderCreateBody(form({ termsAccepted: false }), ctx()).termsAccepted).toBe(false)
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
    ['box_now_locker', { boxnowLockerId: 'L-42' }, { shippingProviderCode: 'boxnow', boxnowLockerId: 'L-42' }],
    ['acs_smartpoint', { acsStationExternalId: 'ACS-7', acsStationBranch: 'ATH' }, { shippingProviderCode: 'acs', acsStationExternalId: 'ACS-7', acsStationBranch: 'ATH' }],
  ])('lets the %s carrier add its own pickup-point fields', (shippingMethod, fields, expected) => {
    const body = buildOrderCreateBody(form({ shippingMethod, ...fields }), ctx())

    expect(body).toMatchObject({ shippingKind: 'pickup_point', ...expected })
  })

  // Django delivers a pickup order to the point and keeps none of the
  // shopper's address (#767): the form's leftovers are not sent.
  it('sends no address and no region for a pickup order, whatever the form still holds', () => {
    const body = buildOrderCreateBody(form({ shippingMethod: 'box_now_locker', boxnowLockerId: 'L-42' }), ctx())

    for (const field of ['street', 'streetNumber', 'city', 'zipcode', 'regionId']) {
      expect(body).not.toHaveProperty(field)
    }
    expect(body).toMatchObject({ firstName: 'Maria', email: 'maria@example.com', phone: '+306912345678', countryId: 1 })
  })

  it('sends a pickup invoice\'s own address even with "same as delivery" left ticked', () => {
    const body = buildOrderCreateBody(form({
      ...INVOICE,
      billingSameAsShipping: true,
      shippingMethod: 'box_now_locker',
      boxnowLockerId: 'L-42',
    }), ctx())

    expect(body).toMatchObject({
      billingStreet: 'Stadiou',
      billingStreetNumber: '5',
      billingCity: 'Piraeus',
      billingZipcode: '185 31',
    })
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

  it('leaves the quote it is placed at to placeOrderAt', () => {
    const body = buildOrderCreateBody(form(), ctx())

    expect(body).not.toHaveProperty('expectedTotal')
    expect(body).not.toHaveProperty('expectedCartDigest')
  })

  describe('placeOrderAt', () => {
    const expectedTotal = { amount: 6300, currency: 'EUR' }

    it('sends the expected total and the cart digest exactly as the quote stated them', () => {
      const body = placeOrderAt(buildOrderCreateBody(form(), ctx()), { expectedTotal, cartDigest: CART_DIGEST })

      expect(body.expectedTotal).toBe(expectedTotal)
      expect(body.expectedCartDigest).toBe(CART_DIGEST)
    })

    it('sends no digest when the quote had none to give', () => {
      expect(placeOrderAt(buildOrderCreateBody(form(), ctx()), { expectedTotal, cartDigest: null })).not.toHaveProperty('expectedCartDigest')
    })
  })

  describe('quoteRequestOf', () => {
    const order = (overrides: Record<string, unknown> = {}) => buildOrderCreateBody(form({ countryId: 'GR', ...overrides }), ctx({
      loyaltyDiscount: { points: 500 },
      giftCards: [{ code: 'GC-1' }],
    }))

    it('prices every input of the order once the payment step is reached', () => {
      // No region: a pickup delivery has none (Django's `ShippingChoice.of`).
      expect(quoteRequestOf(order({ shippingMethod: 'box_now_locker', boxnowLockerId: 'L-42' }), { delivery: true, payWay: true })).toEqual({
        countryId: 'GR',
        giftCardCodes: ['GC-1'],
        loyaltyPointsToRedeem: 500,
        shippingKind: 'pickup_point',
        shippingProviderCode: 'boxnow',
        email: 'maria@example.com',
        boxnowLockerId: 'L-42',
        payWayId: 3,
      })
    })

    // Django digests the pickup point: a quote without it would never
    // carry the digest of the order that has it.
    it('carries the pickup point the order carries, for each carrier', () => {
      expect(quoteRequestOf(order({ shippingMethod: 'acs_smartpoint', acsStationExternalId: 'ACS-7', acsStationBranch: 'ATH' }), { delivery: true, payWay: true }))
        .toMatchObject({ shippingProviderCode: 'acs', acsStationExternalId: 'ACS-7', acsStationBranch: 'ATH' })
    })

    it('leaves out the pay way the form pre-selected before the payment step', () => {
      const request = quoteRequestOf(order(), { delivery: true, payWay: false })

      expect(request).not.toHaveProperty('payWayId')
      expect(request).toMatchObject({ shippingKind: 'home_delivery', email: 'maria@example.com' })
    })

    it('leaves out the delivery and the email on the address step', () => {
      const request = quoteRequestOf(order(), { delivery: false, payWay: false })

      expect(request).not.toHaveProperty('shippingKind')
      expect(request).not.toHaveProperty('shippingProviderCode')
      expect(request).not.toHaveProperty('email')
      expect(request).not.toHaveProperty('boxnowLockerId')
    })

    // The proxy refuses an empty country, which the form holds until the
    // shopper picks one.
    it('sends a blank country, region or email as absent', () => {
      const request = quoteRequestOf(order({ countryId: '', regionId: '', email: '' }), { delivery: true, payWay: true })

      expect(request.countryId).toBeUndefined()
      expect(request.regionId).toBeUndefined()
      expect(request.email).toBeUndefined()
    })
  })
})

describe('billingSharesDelivery', () => {
  it.each([
    [{ shippingMethod: 'home_delivery', billingSameAsShipping: true }, true],
    [{ shippingMethod: 'home_delivery' }, true],
    [{ shippingMethod: 'home_delivery', billingSameAsShipping: false }, false],
    // A pickup point is no company's address.
    [{ shippingMethod: 'box_now_locker', billingSameAsShipping: true }, false],
    [{ shippingMethod: 'acs_smartpoint', billingSameAsShipping: true }, false],
  ])('%j shares the delivery address: %s', (form, shared) => {
    expect(billingSharesDelivery(form)).toBe(shared)
  })
})

describe('sameExpectedTotal', () => {
  it.each([
    [{ amount: 6300, currency: 'EUR' }, { amount: 6300, currency: 'EUR' }, true],
    [{ amount: 6300, currency: 'EUR' }, { amount: 6301, currency: 'EUR' }, false],
    [{ amount: 6300, currency: 'EUR' }, { amount: 6300, currency: 'USD' }, false],
    // A total the shopper was never shown is not the one they accepted.
    [{ amount: 6300, currency: 'EUR' }, null, false],
    [null, null, false],
  ])('%j and %j are the same: %s', (a, b, same) => {
    expect(sameExpectedTotal(a, b)).toBe(same)
  })
})

describe('acceptedQuoteOf', () => {
  it('takes the total and the digest a quote states', () => {
    expect(acceptedQuoteOf(makeCheckoutQuote())).toEqual({ expectedTotal: { amount: 6300, currency: 'EUR' }, cartDigest: CART_DIGEST })
  })

  it('has nothing to accept without a total', () => {
    expect(acceptedQuoteOf(unpricedQuote())).toBeNull()
    expect(acceptedQuoteOf(null)).toBeNull()
  })
})

describe('acceptedQuoteChange', () => {
  const total = { amount: 6300, currency: 'EUR' }

  it.each([
    ['the same quote', { expectedTotal: total, cartDigest: 'a' }, null],
    ['another total', { expectedTotal: { amount: 6400, currency: 'EUR' }, cartDigest: 'a' }, 'total'],
    // A line swapped for one at the same price: only the digest tells.
    ['another cart at the same total', { expectedTotal: total, cartDigest: 'b' }, 'cart'],
  ])('names %s', (_case, accepted, change) => {
    expect(acceptedQuoteChange({ expectedTotal: total, cartDigest: 'a' }, accepted)).toBe(change)
  })

  it('names a quote the shopper was never shown as another total', () => {
    expect(acceptedQuoteChange({ expectedTotal: total, cartDigest: 'a' }, null)).toBe('total')
  })
})

describe('describeCartChange', () => {
  it('names the amount due of the cart now', () => {
    expect(describeCartChange(12.5, t, n)).toEqual({
      title: 'form.submit.error.cart_changed',
      description: 'form.submit.error.cart_changed_description {"total":"currency:12.50"}',
    })
  })
})

describe('describeTotalToConfirm', () => {
  it('names the total the page had not shown, for the shopper to accept', () => {
    expect(describeTotalToConfirm(12.5, t, n)).toEqual({
      title: 'form.submit.error.total_confirm',
      description: 'form.submit.error.total_confirm_description {"total":"currency:12.50"}',
    })
  })
})

describe('describeTotalChange', () => {
  it('names the new amount due', () => {
    expect(describeTotalChange(12.5, t, n)).toEqual({
      title: 'form.submit.error.total_changed',
      description: 'form.submit.error.total_changed_description {"total":"currency:12.50"}',
    })
  })
})

describe('failedStatusOf', () => {
  it.each([
    ['an ofetch error', Object.assign(new Error('x'), { status: 422 }), 422],
    ['an error carrying its response', Object.assign(new Error('x'), { response: { status: 503 } }), 503],
    ['a dropped connection', new TypeError('fetch failed'), undefined],
    ['something that is no error', 'boom', undefined],
    ['nothing', null, undefined],
  ])('reads the status of %s', (_label, error, status) => {
    expect(failedStatusOf(error)).toBe(status)
  })
})

describe('refusedResponseOf', () => {
  it('reads the answer a refused request got', () => {
    const response = { status: 400, _data: { code: 'out_of_stock' } }

    expect(refusedResponseOf(Object.assign(new Error('400'), { response }))).toBe(response)
  })

  it.each([
    ['a dropped connection', new TypeError('fetch failed')],
    ['an error whose response has no status', Object.assign(new Error('x'), { response: {} })],
    ['something that is no error', 'boom'],
    ['nothing', null],
  ])('finds no answer in %s', (_label, error) => {
    expect(refusedResponseOf(error)).toBeUndefined()
  })
})

describe('rejectionSettlesAttempt', () => {
  /** A refusal as ofetch rejects it: the status, and Django's body at `data`. */
  const refused = (status: number, data: unknown = {}) =>
    Object.assign(new Error(String(status)), { response: { status, _data: data }, data })

  it.each([400, 401, 404, 422, 429])('settles the attempt on a %i, which Django replays for the same key', (status) => {
    expect(rejectionSettlesAttempt(refused(status))).toBe(true)
  })

  it.each(['total_changed', 'legal_document_unavailable'])('settles the attempt on a 409 %s, a refusal Django replays too', (code) => {
    expect(rejectionSettlesAttempt(refused(409, { code }))).toBe(true)
  })

  it.each([
    ['no response', new TypeError('fetch failed')],
    ['a 500', refused(500)],
    ['a 503', refused(503)],
    ['a 409 while the same key is still being processed', refused(409, { code: 'idempotency_in_flight' })],
  ])('leaves the attempt open on %s, because the order may exist', (_label, error) => {
    expect(rejectionSettlesAttempt(error)).toBe(false)
  })
})

describe('setDocumentType', () => {
  const invoice = () => ({
    documentType: 'INVOICE',
    billingVatId: '094014201',
    billingCountry: 'GR',
    billingCompanyName: 'Ακμή ΑΕ',
    billingTaxOffice: 'ΦΑΕ Αθηνών',
    billingActivity: 'Λιανικό εμπόριο',
    billingSameAsShipping: false,
    billingStreet: 'Πανεπιστημίου',
    billingStreetNumber: '10',
    billingCity: 'Αθήνα',
    billingZipcode: '10671',
    email: 'buyer@example.com',
  })

  it('wipes every billing field for a receipt, and nothing else', () => {
    const form = invoice()

    setDocumentType(form, 'RECEIPT')

    expect(form).toEqual({
      documentType: 'RECEIPT',
      billingVatId: '',
      billingCountry: '',
      billingCompanyName: '',
      billingTaxOffice: '',
      billingActivity: '',
      billingSameAsShipping: true,
      billingStreet: '',
      billingStreetNumber: '',
      billingCity: '',
      billingZipcode: '',
      email: 'buyer@example.com',
    })
  })

  it('keeps what the shopper typed for an invoice', () => {
    const form = invoice()

    setDocumentType(form, 'INVOICE')

    expect(form).toEqual(invoice())
  })
})
