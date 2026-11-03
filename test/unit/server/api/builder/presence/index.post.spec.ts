import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/builder/presence/index.post'
import { BUILDER_STAFF_TOKEN, signInBuilderStaff } from '~~/test/helpers/builderStaff'
import { backend, callRoute, jsonResponse } from '~~/test/helpers/nitro'

const route = '/api/builder/presence'

const others = {
  documents: {
    'template:home': [{ id: 9, name: 'Nikos', since: '2026-11-03T10:00:00+02:00' }],
    'group:header': [],
  },
}

const beat = (cookie: string | undefined, body: unknown) => callRoute(handler, {
  route,
  method: 'POST',
  body,
  headers: cookie ? { cookie } : {},
})

describe('POST /api/builder/presence', () => {
  it('says which documents are open as the staff member, and answers who else has them', async () => {
    const cookie = await signInBuilderStaff()
    backend.replyOnce(others)

    const response = await beat(cookie, { documents: ['template:home', 'group:header'] })

    expect(response.status).toBe(200)
    expect(response.body).toEqual(others)
    expect(backend.lastRequest).toMatchObject({
      path: 'http://backend.test/api/v1/builder/presence',
      method: 'POST',
      body: { documents: ['template:home', 'group:header'] },
    })
    expect(backend.lastRequest.headers.get('authorization')).toBe(`StaffBearer ${BUILDER_STAFF_TOKEN}`)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it('lets go of every document with an empty list', async () => {
    const cookie = await signInBuilderStaff()
    backend.replyOnce({ documents: {} })

    const response = await beat(cookie, { documents: [] })

    expect(response.status).toBe(200)
    expect(backend.lastRequest.body).toEqual({ documents: [] })
  })

  it.each([
    ['no list', {}],
    ['a key that is not a string', { documents: [1] }],
    ['an empty key', { documents: [''] }],
  ])('refuses %s before it asks Django', async (_case, body) => {
    const cookie = await signInBuilderStaff()
    const asked = backend.requests.length

    const response = await beat(cookie, body)

    expect(response.status).toBe(400)
    expect(backend.requests).toHaveLength(asked)
  })

  it('answers the refusal of Django for a key that is no document as it is', async () => {
    const cookie = await signInBuilderStaff()
    const body = { detail: 'Invalid.', code: 'invalid_document', errors: [{ path: '/documents/0', code: 'invalid_key', message: 'nope is not a document key.' }] }
    backend.replyOnce(jsonResponse(body, 400))

    const response = await beat(cookie, { documents: ['nope'] })

    expect(response.status).toBe(400)
    expect(response.body).toEqual(body)
  })

  it('refuses a request without a staff session', async () => {
    const response = await beat(undefined, { documents: ['template:home'] })

    expect(response.status).toBe(401)
    expect(backend.requests).toHaveLength(0)
  })
})
