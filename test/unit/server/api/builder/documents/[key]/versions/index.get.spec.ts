import { describe, expect, it } from 'vitest'
import { BUILDER_VERSIONS_PAGE_SIZE } from '~~/shared/constants/builderEditor'
import handler from '~~/server/api/builder/documents/[key]/versions/index.get'
import { BUILDER_STAFF_TOKEN, signInBuilderStaff } from '~~/test/helpers/builderStaff'
import { backend, callRoute } from '~~/test/helpers/nitro'

const route = '/api/builder/documents/:key/versions'

const page = {
  count: 1,
  totalPages: 1,
  results: [{
    id: 9,
    number: 3,
    kind: 'checkpoint',
    note: 'Before the sale',
    createdAt: '2026-11-02T10:00:00+02:00',
    createdBy: { id: 7, name: 'Maria Papadopoulou' },
    sizeBytes: 1200,
    blockTypes: ['hero_banner@1'],
    catalogueHash: 'abc',
  }],
}

const read = (cookie: string | undefined, query = '') => callRoute(handler, {
  route,
  url: `/api/builder/documents/template%3Ahome/versions${query}`,
  headers: cookie ? { cookie } : {},
})

describe('GET /api/builder/documents/<key>/versions', () => {
  it('answers a page of the history, asking Django for the page size the editor uses', async () => {
    const cookie = await signInBuilderStaff()
    backend.replyOnce(page)

    const response = await read(cookie, '?page=2')

    expect(response.status).toBe(200)
    expect(response.body).toEqual(page)
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/builder/documents/template%3Ahome/versions')
    expect(backend.lastRequest.query).toEqual({ page: '2', pageSize: String(BUILDER_VERSIONS_PAGE_SIZE) })
    expect(backend.lastRequest.headers.get('authorization')).toBe(`StaffBearer ${BUILDER_STAFF_TOKEN}`)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it('refuses a page that is not a number before it asks Django', async () => {
    const cookie = await signInBuilderStaff()
    const asked = backend.requests.length

    const response = await read(cookie, '?page=abc')

    expect(response.status).toBe(400)
    expect(backend.requests).toHaveLength(asked)
  })

  it('refuses a request without a staff session', async () => {
    const response = await read(undefined)

    expect(response.status).toBe(401)
  })
})
