import { describe, expect, it } from 'vitest'
import handler from '~~/server/routes/checkout/viva-return.get'
import { backend, callRoute, jsonResponse, log } from '~~/test/helpers/nitro'

/**
 * GET /checkout/viva-return: where Viva Smart Checkout sends the shopper
 * after paying. The route turns Viva's `t` (transaction) / `s` (order
 * code) into the order — or gift-card purchase — through Django's public
 * lookup and redirects to the page that polls its payment status. Every
 * failure lands on the cart with `paymentError=lookup`, never on an
 * error page mid-payment.
 */

const route = '/checkout/viva-return'
const ORDER_UUID = '11111111-2222-4333-8444-555555555555'
const PURCHASE_UUID = '99999999-8888-4777-8666-555555555555'
const TRANSACTION = 'b1a2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const ORDER_CODE = '1234567890123456'

const land = (query: string, headers?: Record<string, string>) =>
  callRoute(handler, { route, url: `${route}${query}`, headers })

const LOOKUP_FAILED = '/cart?paymentError=lookup'

describe('GET /checkout/viva-return', () => {
  it('asks Django about the payment as the caller\'s store', async () => {
    backend.reply({ kind: 'order', id: 7, uuid: ORDER_UUID, paymentStatus: 'COMPLETED' })

    await land(`?t=${TRANSACTION}&s=${ORDER_CODE}`, { 'x-forwarded-host': 'evil.example' })

    const sent = backend.lastRequest
    expect(sent.path).toBe('http://backend.test/api/v1/order/viva_return')
    expect(sent.query).toEqual({ t: TRANSACTION, s: ORDER_CODE })
    expect(sent.headers.get('x-forwarded-host')).toBe('shop.test')
  })

  it.each([
    ['both params', `?t=${TRANSACTION}&s=${ORDER_CODE}`, `/checkout/success/${ORDER_UUID}?s=${ORDER_CODE}&t=${TRANSACTION}`],
    ['only the order code (the webhook has not landed)', `?s=${ORDER_CODE}`, `/checkout/success/${ORDER_UUID}?s=${ORDER_CODE}`],
    ['only the transaction', `?t=${TRANSACTION}`, `/checkout/success/${ORDER_UUID}?t=${TRANSACTION}`],
  ])('redirects an order payment with %s to its success page', async (_label, query, location) => {
    backend.reply({ kind: 'order', id: 7, uuid: ORDER_UUID })

    const response = await land(query)

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe(location)
  })

  it('sends a gift-card purchase to the gift-card result page', async () => {
    backend.reply({ kind: 'gift_card_purchase', purchaseUuid: PURCHASE_UUID, purchaseStatus: 'PENDING' })

    const response = await land(`?t=${TRANSACTION}&s=${ORDER_CODE}`)

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe(`/gift-cards/success?purchase=${PURCHASE_UUID}`)
  })

  it('sends a return with neither param to the cart without asking Django', async () => {
    const response = await land('')

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe(LOOKUP_FAILED)
    expect(backend.requests).toEqual([])
    expect(log.warn).toHaveBeenCalled()
  })

  it.each([
    ['Django does not know the payment', () => backend.reply(jsonResponse({ detail: 'Not found.' }, 404))],
    ['Django answers an unexpected payload', () => backend.reply({ kind: 'order', uuid: 'not-a-uuid' })],
    ['Django is unreachable', () => backend.reply(() => {
      throw new TypeError('fetch failed')
    })],
  ])('sends the shopper to the cart when %s', async (_label, arrange) => {
    arrange()

    const response = await land(`?s=${ORDER_CODE}`)

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe(LOOKUP_FAILED)
    expect(log.error).toHaveBeenCalledWith(expect.objectContaining({ action: 'vivaReturn:resolveOrder', orderCode: ORDER_CODE }))
  })

  it.each([
    ['an order with no uuid', { kind: 'order', id: 7 }],
    ['a gift-card purchase with no purchase uuid', { kind: 'gift_card_purchase', purchaseStatus: 'PENDING' }],
  ])('sends the shopper to the cart when Django answers %s', async (_label, answer) => {
    // Django publishes the answer as one object with every field
    // optional, so the shape the redirect needs is not guaranteed by the
    // contract — a missing id must never become /checkout/success/undefined.
    backend.reply(answer)

    const response = await land(`?s=${ORDER_CODE}`)

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe(LOOKUP_FAILED)
    expect(log.error).toHaveBeenCalledWith(expect.objectContaining({ action: 'vivaReturn:resolveOrder', orderCode: ORDER_CODE }))
  })

  it('refuses an oversized parameter before any lookup', async () => {
    const response = await land(`?t=${'x'.repeat(65)}`)

    expect(response.status).toBe(400)
    expect(backend.requests).toEqual([])
  })
})
