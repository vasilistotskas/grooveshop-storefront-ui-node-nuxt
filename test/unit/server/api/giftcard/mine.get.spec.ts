import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/giftcard/mine.get'
import { makeGiftCard } from '~~/test/fixtures/giftCard'
import { backend, callRoute, testSession } from '~~/test/helpers/nitro'

/**
 * GET /api/giftcard/mine: the signed-in shopper's gift cards, parsed with
 * the generated `zListMyGiftCardsResponse`. A card issued with no
 * recipient (in the store's admin, to the account) has `recipientEmail:
 * null`; it used to be `""`, which `z.email()` refused, so the shopper's
 * whole list answered 422.
 */
const API = 'http://backend.test/api/v1'

describe('GET /api/giftcard/mine', () => {
  it('lists a card that has no recipient', async () => {
    testSession.set({ user: { id: 1 }, secure: { accessToken: 'knox-1' } })
    const cards = [
      makeGiftCard({ id: 1 }),
      makeGiftCard({ id: 2, recipientEmail: null, recipientName: '' }),
    ]
    backend.reply((request) => {
      if (request.path !== `${API}/giftcard/mine`) throw new Error(`unexpected request ${request.path}`)
      return { count: 2, results: cards }
    })

    const response = await callRoute(handler, { url: '/api/giftcard/mine' })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ count: 2, results: cards })
  })
})
