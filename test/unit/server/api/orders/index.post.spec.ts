import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/orders/index.post'
import { zCreateOrderResponse } from '~~/shared/openapi/zod.gen'
import { backend, callRoute, jsonResponse } from '~~/test/helpers/nitro'

/**
 * POST /api/orders: the checkout's order creation. Beyond the proxy it
 * carries the Meta Conversions API attribution — fbp/fbc from the
 * browser pixel's cookies and the shopper's own user agent and IP, read
 * from the request rather than trusted from the body — and it RETURNS a
 * Django 4xx body (the DRF field errors the checkout toast needs).
 */

const route = '/api/orders'
const CART_UUID = '6f1c1d8e-2a4b-4c3d-9e8f-0a1b2c3d4e5f'

const orderBody = {
  payWayId: 1,
  firstName: 'Maria',
  lastName: 'Papadopoulou',
  email: 'maria@example.com',
  street: 'Egnatias',
  streetNumber: '12',
  city: 'Thessaloniki',
  zipcode: '546 22',
  countryId: 'GR',
  phone: '+306900000000',
}

const TIMESTAMP = '2026-01-01T00:00:00Z'

/** An `OrderDetail` as Django serialises it (proved against the schema below). */
const createdOrder = {
  id: 7,
  user: null,
  country: 'GR',
  region: null,
  street: 'Egnatias',
  streetNumber: '12',
  payWay: 1,
  status: 'PENDING',
  statusDisplay: 'Pending',
  statusUpdatedAt: null,
  firstName: 'Maria',
  lastName: 'Papadopoulou',
  email: 'maria@example.com',
  zipcode: '546 22',
  city: 'Thessaloniki',
  phone: '+306900000000',
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
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
  uuid: '11111111-2222-4333-8444-555555555555',
  totalPriceItems: 0,
  totalPriceExtra: 0,
  discountAmount: 0,
  loyaltyDiscount: 0,
  giftCardAmount: 0,
  fullAddress: 'Egnatias 12, Thessaloniki',
  paymentStatusDisplay: '',
  payWayKey: 'PAY_ON_DELIVERY',
  isOnlinePayment: false,
  isCollectedOnDelivery: true,
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
  cancellation: null,
  appliedCouponCodes: [],
  customerFullName: 'Maria Papadopoulou',
  isCompleted: false,
  isCanceled: false,
  metaEventIds: {},
  currency: 'EUR',
  isFirstOrder: true,
}

function placeOrder(options: { body?: Record<string, unknown>, headers?: Record<string, string>, remoteAddress?: string } = {}) {
  return callRoute(handler, {
    route,
    method: 'POST',
    body: options.body ?? orderBody,
    headers: options.headers,
    remoteAddress: options.remoteAddress,
  })
}

describe('POST /api/orders', () => {
  it('uses a response fixture the generated schema accepts', () => {
    expect(zCreateOrderResponse.safeParse(createdOrder).success).toBe(true)
  })

  it('creates the order for the session cart with the shopper\'s identity, not the pod\'s', async () => {
    backend.reply(createdOrder)

    const response = await placeOrder({
      headers: {
        'cookie': `cart-id=${CART_UUID}`,
        'user-agent': 'Mozilla/5.0 (iPhone) Instagram 300.0',
        'cf-connecting-ip': '203.0.113.9',
        'x-origin-verify': 'edge-secret',
        'x-forwarded-host': 'evil.example',
      },
    })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ id: 7, uuid: createdOrder.uuid })
    const sent = backend.lastRequest
    expect(sent.method).toBe('POST')
    expect(sent.path).toBe('http://backend.test/api/v1/order')
    expect(sent.headers.get('x-cart-id')).toBe(CART_UUID)
    expect(sent.headers.get('x-forwarded-host')).toBe('shop.test')
    expect(sent.headers.get('user-agent')).toBe('Mozilla/5.0 (iPhone) Instagram 300.0')
    expect(sent.headers.get('x-real-ip')).toBe('203.0.113.9')
    expect(sent.headers.get('x-origin-verify')).toBe('edge-secret')
  })

  it('adds the pixel cookies, user agent and client IP to meta, keeping what the browser sent', async () => {
    backend.reply(createdOrder)

    await placeOrder({
      body: { ...orderBody, meta: { event_ids: { purchase: 'evt-1' }, consent: true } },
      headers: {
        'cookie': '_fbp=fb.1.1700000000.123; theme=dark; _fbc=fb.1.1700000000.IwAR%3Dclick',
        'user-agent': 'Mozilla/5.0 (Android)',
        'cf-connecting-ip': '198.51.100.4',
      },
    })

    expect(backend.lastRequest.body.meta).toEqual({
      event_ids: { purchase: 'evt-1' },
      consent: true,
      fbp: 'fb.1.1700000000.123',
      fbc: 'fb.1.1700000000.IwAR=click',
      client_user_agent: 'Mozilla/5.0 (Android)',
      client_ip_address: '198.51.100.4',
    })
  })

  it('overrides a client-supplied IP and user agent with the request\'s own', async () => {
    backend.reply(createdOrder)

    await placeOrder({
      body: { ...orderBody, meta: { client_ip_address: '6.6.6.6', client_user_agent: 'forged' } },
      headers: { 'user-agent': 'Real UA', 'cf-connecting-ip': '198.51.100.4' },
    })

    expect(backend.lastRequest.body.meta).toMatchObject({
      client_ip_address: '198.51.100.4',
      client_user_agent: 'Real UA',
    })
  })

  it.each([
    ['CF-Connecting-IP first', { 'cf-connecting-ip': '198.51.100.1', 'true-client-ip': '198.51.100.2', 'x-forwarded-for': '198.51.100.3' }, '198.51.100.1'],
    ['then True-Client-IP', { 'true-client-ip': '198.51.100.2', 'x-forwarded-for': '198.51.100.3, 10.0.0.1' }, '198.51.100.2'],
    ['then the first X-Forwarded-For hop', { 'x-forwarded-for': '198.51.100.3, 10.0.0.1' }, '198.51.100.3'],
    ['then the socket peer', {}, '10.1.2.3'],
  ])('takes the client IP from %s', async (_label, headers, expected) => {
    backend.reply(createdOrder)

    await placeOrder({ headers, remoteAddress: '10.1.2.3' })

    expect(backend.lastRequest.body.meta.client_ip_address).toBe(expected)
  })

  it('sends the body without a meta key when there is nothing to attribute', async () => {
    backend.reply(createdOrder)

    // No cookies, no user agent, no IP header, no socket peer.
    await placeOrder()

    expect(backend.lastRequest.body).not.toHaveProperty('meta')
    expect(backend.lastRequest.body).toMatchObject({ payWayId: 1, email: 'maria@example.com' })
  })

  it('rejects a body the order schema refuses without calling the backend', async () => {
    const response = await placeOrder({ body: { ...orderBody, email: 'not-an-email' } })

    expect(response.status).toBe(400)
    expect(backend.requests).toEqual([])
  })

  it('returns Django\'s field errors with its 4xx status, for the checkout toast', async () => {
    const fieldErrors = { phone: ['Enter a valid phone number.'] }
    backend.reply(jsonResponse(fieldErrors, 400))

    const response = await placeOrder()

    expect(response.status).toBe(400)
    expect(response.body).toEqual(fieldErrors)
    expect(response.error).toBeUndefined()
  })

  it('throws a 5xx without forwarding Django\'s body', async () => {
    backend.reply(jsonResponse({ detail: 'stripe.error.APIConnectionError at /internal' }, 500))

    const response = await placeOrder({ body: { ...orderBody } })

    expect(response.status).toBe(500)
    expect(JSON.stringify(response.body)).not.toContain('stripe.error')
  })

  it.each([
    ['created', () => backend.reply(createdOrder), true],
    ['refused', () => backend.reply(jsonResponse({ phone: ['bad'] }, 400)), false],
  ])('records on the wide event whether the order was %s', async (_label, arrange, created) => {
    arrange()

    const response = await placeOrder()

    expect(response.logger.fields).toMatchObject({ order: { created } })
  })
})
