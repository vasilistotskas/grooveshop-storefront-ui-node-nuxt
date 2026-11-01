import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/emails/unsubscribe/[token]/all.post'
import { backend, callRoute, jsonResponse } from '~~/test/helpers/nitro'

const route = '/api/emails/unsubscribe/:token/all'
const token = 'a'.repeat(64)

const unsubscribeFromAll = (tokenSegment = token) =>
  callRoute(handler, { route, url: `/api/emails/unsubscribe/${tokenSegment}/all`, method: 'POST' })

describe('POST /api/emails/unsubscribe/[token]/all', () => {
  it('POSTs the token to Django\'s /all endpoint and answers 204 with no body', async () => {
    backend.reply(new Response(null, { status: 200 }))

    const response = await unsubscribeFromAll()

    expect(response.status).toBe(204)
    expect(backend.lastRequest).toMatchObject({
      path: `http://backend.test/api/v1/emails/unsubscribe/${token}/all`,
      method: 'POST',
    })
  })

  it('encodes the raw token again, so Django decodes it back to the literal token and never to a path', async () => {
    backend.reply(new Response(null, { status: 200 }))

    await unsubscribeFromAll('..%2Faccount')

    expect(backend.lastRequest.url.pathname).toBe('/api/v1/emails/unsubscribe/..%252Faccount/all')
  })

  it('returns an upstream 400 with its body, so the page can say the link is invalid', async () => {
    backend.reply(jsonResponse({ detail: 'nope', code: 'unsubscribe_token_invalid' }, 400))

    const response = await unsubscribeFromAll()

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ detail: 'nope', code: 'unsubscribe_token_invalid' })
  })
})
