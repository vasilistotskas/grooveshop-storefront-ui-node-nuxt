import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/builder/publish.post'
import { BUILDER_STAFF_TOKEN, signInBuilderStaff } from '~~/test/helpers/builderStaff'
import { backend, callRoute, jsonResponse } from '~~/test/helpers/nitro'

const route = '/api/builder/publish'

const publish = (body: unknown, cookie?: string) => callRoute(handler, { route, method: 'POST', body, headers: cookie ? { cookie } : {} })

const RELEASE = {
  id: 9,
  number: 7,
  publishedAt: '2026-11-03T10:00:00+02:00',
  publishedBy: { id: 7, name: 'Maria Papadopoulou' },
  note: 'Νέο banner',
  rolledBackFrom: null,
  versions: { 'template:home': 4 },
  documents: [{ key: 'template:home', versionNumber: 4, changed: true }],
}

describe('POST /api/builder/publish', () => {
  it('publishes the named documents together, as the staff member, and answers the release', async () => {
    const cookie = await signInBuilderStaff()
    backend.replyOnce(jsonResponse(RELEASE, 201))

    const response = await publish({ documents: ['template:home', 'group:header'], note: 'Νέο banner' }, cookie)

    expect(response.status).toBe(200)
    expect(response.body).toEqual(RELEASE)
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/builder/publish')
    expect(backend.lastRequest.method).toBe('POST')
    expect(backend.lastRequest.body).toEqual({ documents: ['template:home', 'group:header'], note: 'Νέο banner' })
    expect(backend.lastRequest.headers.get('authorization')).toBe(`StaffBearer ${BUILDER_STAFF_TOKEN}`)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it('refuses a body that names no documents, and asks Django nothing', async () => {
    const cookie = await signInBuilderStaff()

    const response = await publish({ note: 'x' }, cookie)

    expect(response.status).toBe(400)
    expect(backend.requests.map(request => request.path)).not.toContain('http://backend.test/api/v1/builder/publish')
  })

  it('refuses a request without a staff session', async () => {
    const response = await publish({ documents: ['template:home'] })

    expect(response.status).toBe(401)
    expect(backend.requests).toHaveLength(0)
  })

  it('returns Django\'s refusal as it is, every problem with its document', async () => {
    const cookie = await signInBuilderStaff()
    const refusal = {
      code: 'invalid_document',
      detail: 'The document has problems that must be fixed first.',
      errors: [{ document: 'template:home', path: '/sections/hero/settings/ctaLink', code: 'reference_not_found', message: 'Product 12 does not exist in this store.' }],
    }
    backend.replyOnce(jsonResponse(refusal, 400))

    const response = await publish({ documents: ['template:home'] }, cookie)

    expect(response.status).toBe(400)
    expect(response.body).toEqual(refusal)
  })
})
