import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/products/brands/all.get'
import { backend, callRoute, jsonResponse, log } from '~~/test/helpers/nitro'

/**
 * GET /api/products/brands/all: the brand list the filters map facet ids
 * to names with. Its cache key is covered by `cached-handlers.spec.ts`.
 */
const route = '/api/products/brands/all'
const brands = [{ id: 3, name: 'Kabelo' }, { id: 7, name: 'Voltra' }]

const list = () => callRoute(handler, { route, url: route })

describe('GET /api/products/brands/all', () => {
  it('GETs the unpaginated brand list from Django and returns it', async () => {
    backend.reply(brands)

    const response = await list()

    expect(response.status).toBe(200)
    expect(response.body).toEqual(brands)
    expect(backend.lastRequest.method).toBe('GET')
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/product/brand/all')
  })

  it('answers 422 and logs a response contract failure when the payload drifts', async () => {
    backend.reply([{ id: 3 }])

    const response = await list()

    expect(response.status).toBe(422)
    expect(log.error).toHaveBeenCalledWith(expect.objectContaining({ action: 'validation:response' }))
  })

  it('passes an upstream 5xx through without its body', async () => {
    backend.reply(jsonResponse({ detail: 'db: connection refused at 10.0.0.5' }, 503))

    const response = await list()

    expect(response.status).toBe(503)
    expect(JSON.stringify(response.body)).not.toContain('10.0.0.5')
  })
})
