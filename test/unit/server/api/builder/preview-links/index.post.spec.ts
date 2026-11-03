import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/builder/preview-links/index.post'
import { BUILDER_STAFF_TOKEN, signInBuilderStaff } from '~~/test/helpers/builderStaff'
import { backend, callRoute, jsonResponse } from '~~/test/helpers/nitro'

const route = '/api/builder/preview-links'

const created = {
  token: 'aGVsbG8td29ybGQtdG9rZW4tMTIzNDU2Nzg5MA',
  id: 5,
  documents: ['group:header', 'template:home'],
  note: 'For Maria',
  createdBy: { id: 7, name: 'Maria Papadopoulou' },
  createdAt: '2026-11-03T10:00:00+02:00',
  expiresAt: '2026-11-10T10:00:00+02:00',
}

const make = (cookie: string | undefined, body: unknown) => callRoute(handler, {
  route,
  method: 'POST',
  body,
  headers: cookie ? { cookie } : {},
})

describe('POST /api/builder/preview-links', () => {
  it('freezes the documents behind a link and answers it with its token', async () => {
    const cookie = await signInBuilderStaff()
    backend.replyOnce(created)

    const response = await make(cookie, { documents: ['template:home', 'group:header'], note: 'For Maria' })

    expect(response.status).toBe(201)
    expect(response.body).toEqual(created)
    expect(backend.lastRequest).toMatchObject({
      path: 'http://backend.test/api/v1/builder/preview-links',
      method: 'POST',
      body: { documents: ['template:home', 'group:header'], note: 'For Maria' },
    })
    expect(backend.lastRequest.headers.get('authorization')).toBe(`StaffBearer ${BUILDER_STAFF_TOKEN}`)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it.each([
    ['no documents', { documents: [] }],
    ['a key that is not a document', { documents: ['home'] }],
    ['more documents than a page and its groups', { documents: ['template:home', 'group:header', 'group:mobile', 'group:footer', 'group:extra'] }],
    ['a note too long', { documents: ['template:home'], note: 'x'.repeat(256) }],
  ])('refuses %s before it asks Django', async (_case, body) => {
    const cookie = await signInBuilderStaff()
    const asked = backend.requests.length

    const response = await make(cookie, body)

    expect(response.status).toBe(400)
    expect(backend.requests).toHaveLength(asked)
  })

  it('answers the refusal of Django for an invalid draft as it is', async () => {
    const cookie = await signInBuilderStaff()
    const body = { detail: 'The document is not valid.', code: 'invalid_document', errors: [{ path: '/sections/hero', code: 'invalid_settings', message: 'Too long.', document: 'template:home' }] }
    backend.replyOnce(jsonResponse(body, 400))

    const response = await make(cookie, { documents: ['template:home'] })

    expect(response.status).toBe(400)
    expect(response.body).toEqual(body)
  })

  it('refuses a request without a staff session', async () => {
    const response = await make(undefined, { documents: ['template:home'] })

    expect(response.status).toBe(401)
    expect(backend.requests).toHaveLength(0)
  })
})
