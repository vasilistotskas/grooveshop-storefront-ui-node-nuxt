import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/builder/documents/[key]/index.get'
import { BUILDER_STAFF_TOKEN, signInBuilderStaff } from '~~/test/helpers/builderStaff'
import { backend, callRoute, jsonResponse } from '~~/test/helpers/nitro'

const route = '/api/builder/documents/:key'

const detail = {
  key: 'template:home',
  kind: 'template',
  draftRevision: 4,
  updatedAt: '2026-11-02T10:00:00+02:00',
  updatedBy: null,
  publishedVersion: null,
  hasUnpublishedChanges: true,
  draft: { sections: { hero_1: { type: 'hero_banner@1', settings: { heading: 'Γεια' } } }, order: ['hero_1'] },
  i18n: { en: { hero_1: { '/heading': 'Hello' } } },
  draftCatalogueHash: 'abc123',
}

const read = (key: string, cookie?: string) => callRoute(handler, {
  route,
  url: `/api/builder/documents/${encodeURIComponent(key)}`,
  headers: cookie ? { cookie } : {},
})

describe('GET /api/builder/documents/<key>', () => {
  it('answers the working copy and its envelope, the content untouched', async () => {
    const cookie = await signInBuilderStaff()
    backend.replyOnce(detail)

    const response = await read('template:home', cookie)

    expect(response.status).toBe(200)
    expect(response.body).toEqual(detail)
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/builder/documents/template%3Ahome')
    expect(backend.lastRequest.headers.get('authorization')).toBe(`StaffBearer ${BUILDER_STAFF_TOKEN}`)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it.each(['home', 'page:', 'page:Home', 'template:../x', 'themes'])('refuses the key %j before it asks Django', async (key) => {
    const cookie = await signInBuilderStaff()
    const asked = backend.requests.length

    const response = await read(key, cookie)

    expect(response.status).toBe(400)
    expect(backend.requests).toHaveLength(asked)
  })

  it('refuses a request without a staff session', async () => {
    const response = await read('template:home')

    expect(response.status).toBe(401)
    expect(backend.requests).toHaveLength(0)
  })

  it('returns Django\'s 404 for a key it does not hold, as it is', async () => {
    const cookie = await signInBuilderStaff()
    backend.replyOnce(jsonResponse({ detail: 'Not found.' }, 404))

    const response = await read('page:gone', cookie)

    expect(response.status).toBe(404)
    expect(response.body).toEqual({ detail: 'Not found.' })
  })
})
