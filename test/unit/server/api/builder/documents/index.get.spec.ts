import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/builder/documents/index.get'
import { BUILDER_STAFF_TOKEN, signInBuilderStaff } from '~~/test/helpers/builderStaff'
import { backend, callRoute, jsonResponse } from '~~/test/helpers/nitro'

const route = '/api/builder/documents'

const documentRow = (key: string, kind: string) => ({
  key,
  kind,
  draftRevision: 3,
  updatedAt: '2026-11-02T10:00:00+02:00',
  updatedBy: { id: 7, name: 'Maria Papadopoulou' },
  publishedVersion: 2,
  hasUnpublishedChanges: true,
})

const page = (results: unknown[], pageNumber: number, totalPages: number) => ({
  links: { next: null, previous: null },
  count: results.length,
  totalPages,
  pageSize: 100,
  pageTotalResults: results.length,
  page: pageNumber,
  results,
})

const list = (cookie?: string) => callRoute(handler, { route, headers: cookie ? { cookie } : {} })

describe('GET /api/builder/documents', () => {
  it('lists the store\'s documents for the signed-in staff member, with their token as StaffBearer', async () => {
    const cookie = await signInBuilderStaff()
    const rows = [documentRow('group:header', 'group'), documentRow('template:home', 'template')]
    backend.replyOnce(page(rows, 1, 1))

    const response = await list(cookie)

    expect(response.status).toBe(200)
    expect(response.body).toEqual(rows)
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/builder/documents')
    expect(backend.lastRequest.query).toEqual({ page: '1', pageSize: '100' })
    expect(backend.lastRequest.headers.get('authorization')).toBe(`StaffBearer ${BUILDER_STAFF_TOKEN}`)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it('walks every page Django serves and answers them as one list, in order', async () => {
    const cookie = await signInBuilderStaff()
    backend.replyOnce(page([documentRow('page:about', 'page')], 1, 2))
    backend.replyOnce(page([documentRow('template:home', 'template')], 2, 2))

    const response = await list(cookie)

    expect(response.body.map((row: { key: string }) => row.key)).toEqual(['page:about', 'template:home'])
    expect(backend.requests.slice(-2).map(request => request.query.page)).toEqual(['1', '2'])
  })

  it('refuses a request without a staff session, and asks Django nothing', async () => {
    const response = await list()

    expect(response.status).toBe(401)
    expect(backend.requests).toHaveLength(0)
  })

  it('returns Django\'s refusal as it is', async () => {
    const cookie = await signInBuilderStaff()
    backend.replyOnce(jsonResponse({ detail: 'staff_token_scope' }, 403))

    const response = await list(cookie)

    expect(response.status).toBe(403)
    expect(response.body).toEqual({ detail: 'staff_token_scope' })
  })
})
