import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import handler from '~~/server/api/user/account/summary.get'
import { makeBusinessProfile } from '~~/test/fixtures/business'
import { makeGiftCard } from '~~/test/fixtures/giftCard'
import { makeSummary, makeTier } from '~~/test/fixtures/loyalty'
import { makeOrderListItem } from '~~/test/fixtures/order'
import { backend, callRoute, jsonResponse, testSession } from '~~/test/helpers/nitro'
import type { BackendRequest } from '~~/test/helpers/nitro'

/**
 * GET /api/user/account/summary: the account band's figures, composed
 * from four Django endpoints. A 404 from the loyalty, gift-card or B2B
 * one means the store has that feature off (or the shopper has no
 * business profile) and makes that part `null`; anything else fails.
 */
const API = 'http://backend.test/api/v1'
const NOW = '2026-06-01T00:00:00Z'

const signIn = () => testSession.set({ user: { id: 1 }, secure: { accessToken: 'knox-1' } })
const summary = () => callRoute(handler, { url: '/api/user/account/summary' })

type Replies = Partial<Record<'orders' | 'loyalty' | 'giftCards' | 'business', unknown>>

function answer(replies: Replies = {}) {
  const defaults: Required<Replies> = {
    orders: { count: 14, results: [makeOrderListItem()] },
    loyalty: makeSummary({ pointsBalance: 2340, tier: makeTier({ id: 2 }) }),
    giftCards: [makeGiftCard({ id: 1, balance: 30 }), makeGiftCard({ id: 2, balance: 12 })],
    business: makeBusinessProfile(),
  }
  const routes: Record<string, keyof Replies> = {
    [`${API}/order/my_orders`]: 'orders',
    [`${API}/loyalty/summary`]: 'loyalty',
    [`${API}/giftcard/mine`]: 'giftCards',
    [`${API}/b2b/profile`]: 'business',
  }
  backend.reply((request: BackendRequest) => {
    const part = routes[request.path]
    if (!part) throw new Error(`unexpected request ${request.path}`)
    return part in replies ? replies[part] : defaults[part]
  })
}

const notFound = () => jsonResponse({ detail: 'Not found.' }, 404)

describe('GET /api/user/account/summary', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('composes the band from the four endpoints, as the signed-in shopper', async () => {
    signIn()
    answer()

    const response = await summary()

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      ordersCount: 14,
      loyalty: { pointsBalance: 2340, tier: makeTier({ id: 2 }) },
      giftCardBalance: 42,
      businessStatus: 'APPROVED',
    })
    expect(backend.requests.map(request => request.headers.get('authorization'))).toEqual(Array(4).fill('Bearer knox-1'))
  })

  it('asks for one order (the count is all it needs) and for every gift card', async () => {
    signIn()
    answer()

    await summary()

    const queryOf = (path: string) => backend.requests.find(request => request.path === `${API}${path}`)!.query
    expect(queryOf('/order/my_orders')).toEqual({ pageSize: '1' })
    expect(queryOf('/giftcard/mine')).toEqual({ pagination: 'false' })
  })

  it('counts only active cards that have not expired', async () => {
    signIn()
    answer({
      giftCards: [
        makeGiftCard({ id: 1, balance: 20 }),
        makeGiftCard({ id: 2, balance: 15, status: 'DISABLED' }),
        makeGiftCard({ id: 3, balance: 9, expiresAt: '2026-05-31T23:59:59Z' }),
        makeGiftCard({ id: 4, balance: 5, expiresAt: '2026-06-02T00:00:00Z' }),
      ],
    })

    expect((await summary()).body).toMatchObject({ giftCardBalance: 25 })
  })

  it.each([
    ['loyalty', { loyalty: null }],
    ['giftCards', { giftCardBalance: null }],
    ['business', { businessStatus: null }],
  ] as const)('leaves out %s when Django has it switched off (404)', async (part, expected) => {
    signIn()
    answer({ [part]: notFound() })

    const response = await summary()

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ ordersCount: 14, ...expected })
  })

  it('fails when one of them fails for another reason', async () => {
    signIn()
    answer({ loyalty: jsonResponse({ detail: 'boom' }, 500) })

    expect((await summary()).status).toBe(500)
  })

  it('refuses a visitor who is not signed in', async () => {
    testSession.set({})

    expect((await summary()).status).toBe(401)
    expect(backend.requests).toEqual([])
  })
})
