import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/subscriptions/topics/[id]/subscribe.post'
import { zSubscribeToTopicResponse } from '~~/shared/openapi/zod.gen'
import { makeUserSubscription } from '~~/test/fixtures/subscription'
import { backend, callRoute, jsonResponse, testSession } from '~~/test/helpers/nitro'

/**
 * POST /api/subscriptions/topics/[id]/subscribe: the shopper subscribes
 * to a topic through Django's own `subscribe` action, which honours the
 * topic's confirmation rule (PENDING + email, or ACTIVE) and re-arms an
 * UNSUBSCRIBED or BOUNCED row rather than colliding with it.
 */
const route = '/api/subscriptions/topics/:id/subscribe'
const signIn = () => testSession.set({ user: { id: 1 }, secure: { accessToken: 'knox-1' } })
const subscribe = (id = '7') => callRoute(handler, { route, url: `/api/subscriptions/topics/${id}/subscribe`, method: 'POST' })

describe('POST /api/subscriptions/topics/[id]/subscribe', () => {
  it('uses a response fixture the generated schema accepts', () => {
    expect(zSubscribeToTopicResponse.safeParse(makeUserSubscription({ topic: 7 })).success).toBe(true)
  })

  it('subscribes through the topic action, as the signed-in shopper', async () => {
    signIn()
    const pending = makeUserSubscription({ topic: 7, status: 'PENDING' })
    backend.reply(pending)

    const response = await subscribe()

    expect(response.status).toBe(200)
    expect(response.body).toEqual(pending)
    expect(backend.lastRequest).toMatchObject({
      method: 'POST',
      path: 'http://backend.test/api/v1/user/subscription/topic/7/subscribe',
    })
    expect(backend.lastRequest.headers.get('authorization')).toBe('Bearer knox-1')
  })

  it('passes Django\'s refusal on with its status', async () => {
    signIn()
    backend.reply(jsonResponse({ detail: 'Already subscribed to this topic.' }, 400))

    expect((await subscribe()).status).toBe(400)
  })

  it('refuses a non-numeric topic without calling Django', async () => {
    signIn()

    expect((await subscribe('abc')).status).toBe(400)
    expect(backend.requests).toEqual([])
  })

  it('refuses a visitor who is not signed in', async () => {
    expect((await subscribe()).status).toBe(401)
    expect(backend.requests).toEqual([])
  })
})
