import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/products/alerts/confirm/[token].post'
import { backend, callRoute, jsonResponse } from '~~/test/helpers/nitro'

const route = '/api/products/alerts/confirm/:token'
const token = 'Zm9v:1k2j3h:abc-DEF_123'

const confirm = (tokenSegment = token) =>
  callRoute(handler, { route, url: `/api/products/alerts/confirm/${tokenSegment}`, method: 'POST' })

describe('POST /api/products/alerts/confirm/[token]', () => {
  it('POSTs the token upstream and returns the kind of alert Django started', async () => {
    backend.reply({ status: 'confirmed', kind: 'price_drop' })

    const response = await confirm(encodeURIComponent(token))

    expect(response.body).toEqual({ status: 'confirmed', kind: 'price_drop' })
    expect(backend.lastRequest).toMatchObject({ method: 'POST' })
  })

  it('encodes the raw token again, so Django decodes it back to the literal token and never to a path', async () => {
    backend.reply({ status: 'confirmed', kind: 'restock' })

    await confirm('..%2Faccount')

    expect(backend.lastRequest.url.pathname).toBe('/api/v1/product/alert/confirm/..%252Faccount')
  })

  it.each([400, 410])('returns an upstream %i with its body, so the page can say which it was', async (status) => {
    backend.reply(jsonResponse({ code: 'confirmation_expired' }, status))

    const response = await confirm()

    expect(response.status).toBe(status)
    expect(response.body).toEqual({ code: 'confirmation_expired' })
  })
})
