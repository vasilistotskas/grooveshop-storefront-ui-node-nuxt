import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/builder/media/index.get'
import { makeAsset } from '~~/test/fixtures/media'
import { BUILDER_STAFF_TOKEN, signInBuilderStaff } from '~~/test/helpers/builderStaff'
import { backend, callRoute, jsonResponse } from '~~/test/helpers/nitro'

const route = '/api/builder/media'

const list = (url: string, cookie?: string) => callRoute(handler, { route, url, headers: cookie ? { cookie } : {} })

const PAGE = { count: 1, results: [makeAsset({ id: 4, usedBy: ['page:home'] })] }

describe('GET /api/builder/media', () => {
  it('asks Django for the library, with the paging and the search it was given, as the staff member', async () => {
    const cookie = await signInBuilderStaff()
    backend.replyOnce(PAGE)

    const response = await list(`${route}?page=2&pageSize=24&search=vitrina&ordering=-createdAt`, cookie)

    expect(response.status).toBe(200)
    expect(response.body).toEqual(PAGE)
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/builder/media')
    expect(backend.lastRequest.query).toEqual({ page: '2', pageSize: '24', search: 'vitrina', ordering: '-createdAt' })
    expect(backend.lastRequest.headers.get('authorization')).toBe(`StaffBearer ${BUILDER_STAFF_TOKEN}`)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it('refuses an ordering the library does not have before it asks Django', async () => {
    const cookie = await signInBuilderStaff()
    const asked = backend.requests.length

    const response = await list(`${route}?ordering=width`, cookie)

    expect(response.status).toBe(400)
    expect(backend.requests).toHaveLength(asked)
  })

  it('refuses a request without a staff session, and asks Django nothing', async () => {
    const response = await list(route)

    expect(response.status).toBe(401)
    expect(backend.requests).toHaveLength(0)
  })

  it('returns the refusal of Django as it is, still never cached', async () => {
    const cookie = await signInBuilderStaff()
    backend.replyOnce(jsonResponse({ detail: 'Invalid page.' }, 404))

    const response = await list(`${route}?page=99`, cookie)

    expect(response.status).toBe(404)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })
})
