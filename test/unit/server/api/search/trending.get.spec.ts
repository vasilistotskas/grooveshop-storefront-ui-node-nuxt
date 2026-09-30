import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/search/trending.get'
import { backend, callRoute } from '~~/test/helpers/nitro'

/** GET /api/search/trending: the last day's top searches, filters renamed to Django's snake_case. */

const route = '/api/search/trending'
const trending = { windowHours: 24, contentType: 'product', languageCode: 'el', results: [] }

describe('GET /api/search/trending', () => {
  it('forwards only the filters given, under Django\'s names', async () => {
    backend.reply(trending)

    const response = await callRoute(handler, { route, url: `${route}?languageCode=el&contentType=product&limit=5` })

    expect(response.status).toBe(200)
    expect(response.body).toEqual(trending)
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/search/trending')
    expect(backend.lastRequest.query).toEqual({ language_code: 'el', content_type: 'product', limit: '5' })
  })

  it('sends no filters when none are given', async () => {
    backend.reply(trending)

    await callRoute(handler, { route })

    expect(backend.lastRequest.query).toEqual({})
  })

  it('answers 400 for a non-integer limit', async () => {
    const response = await callRoute(handler, { route, url: `${route}?limit=many` })

    expect(response.status).toBe(400)
    expect(backend.requests).toEqual([])
  })
})
