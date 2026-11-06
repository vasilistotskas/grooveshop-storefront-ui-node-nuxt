import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/builder/media/[id].patch'
import { makeAsset } from '~~/test/fixtures/media'
import { BUILDER_STAFF_TOKEN, signInBuilderStaff } from '~~/test/helpers/builderStaff'
import { backend, callRoute, jsonResponse } from '~~/test/helpers/nitro'

const patch = (cookie: string | undefined, body: unknown, id = '4') => callRoute(handler, {
  route: '/api/builder/media/:id',
  url: `/api/builder/media/${id}`,
  method: 'PATCH',
  body,
  headers: cookie ? { cookie } : {},
})

const ALT = { alt: { el: 'Μια βιτρίνα', en: 'A shop window' }, focalX: 0.25 }

describe('PATCH /api/builder/media/<id>', () => {
  it('sends the alt text per language and the focal point to Django as the staff member, and answers the asset', async () => {
    const cookie = await signInBuilderStaff()
    backend.replyOnce(makeAsset({ id: 4, focalX: 0.25 }))

    const response = await patch(cookie, ALT)

    expect(response.status).toBe(200)
    expect(response.body).toEqual(makeAsset({ id: 4, focalX: 0.25 }))
    expect(backend.lastRequest).toMatchObject({ path: 'http://backend.test/api/v1/builder/media/4', method: 'PATCH', body: ALT })
    expect(backend.lastRequest.headers.get('authorization')).toBe(`StaffBearer ${BUILDER_STAFF_TOKEN}`)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it('refuses a focal point that is not a number before it asks Django', async () => {
    const cookie = await signInBuilderStaff()
    const asked = backend.requests.length

    const response = await patch(cookie, { focalX: 'left' })

    expect(response.status).toBe(400)
    expect(backend.requests).toHaveLength(asked)
  })

  it('returns the refusal of Django as it is', async () => {
    const cookie = await signInBuilderStaff()
    backend.replyOnce(jsonResponse({ detail: 'Unknown language.', code: 'invalid' }, 400))

    const response = await patch(cookie, ALT)

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ detail: 'Unknown language.', code: 'invalid' })
  })

  it('refuses a request without a staff session', async () => {
    const response = await patch(undefined, ALT)

    expect(response.status).toBe(401)
    expect(backend.requests).toHaveLength(0)
  })
})
