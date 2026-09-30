import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/subscriptions/confirm/[token].post'
import { backend, callRoute, jsonResponse } from '~~/test/helpers/nitro'

const route = '/api/subscriptions/confirm/:token'
const token = 'a'.repeat(64)

const confirm = (tokenSegment = token, headers: Record<string, string> = {}) =>
  callRoute(handler, { route, url: `/api/subscriptions/confirm/${tokenSegment}`, method: 'POST', headers })

describe('POST /api/subscriptions/confirm/[token]', () => {
  it('POSTs the token upstream with the visitor\'s identity', async () => {
    backend.reply({ status: 'confirmed', topic: 'News' })

    const response = await confirm(token, { 'cf-connecting-ip': '203.0.113.9', 'user-agent': 'Mozilla/5.0 (Test)' })

    expect(response.body).toEqual({ status: 'confirmed', topic: 'News' })
    expect(backend.lastRequest).toMatchObject({
      path: `http://backend.test/api/v1/user/subscription/confirm/${token}`,
      method: 'POST',
    })
    // Django records the confirmation's IP.
    expect(backend.lastRequest.headers.get('x-real-ip')).toBe('203.0.113.9')
    expect(backend.lastRequest.headers.get('user-agent')).toBe('Mozilla/5.0 (Test)')
  })

  it('encodes the raw token again, so Django decodes it back to the literal token and never to a path', async () => {
    // Router params are not decoded, so `..%2Faccount` reaches the route
    // as-is; unencoded, Django would decode it to `../account`.
    backend.reply({ status: 'confirmed' })

    await confirm('..%2Faccount')

    expect(backend.lastRequest.url.pathname).toBe('/api/v1/user/subscription/confirm/..%252Faccount')
  })

  it.each([400, 410])('returns an upstream %i with its body, so the page can say which it was', async (status) => {
    backend.reply(jsonResponse({ detail: 'nope' }, status))

    const response = await confirm()

    expect(response.status).toBe(status)
    expect(response.body).toEqual({ detail: 'nope' })
  })
})
