import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/builder/media/[id].get'
import { makeAsset } from '~~/test/fixtures/media'
import { BUILDER_STAFF_TOKEN, signInBuilderStaff } from '~~/test/helpers/builderStaff'
import { backend, callRoute, jsonResponse } from '~~/test/helpers/nitro'

const read = (cookie: string | undefined, id = '4') => callRoute(handler, {
  route: '/api/builder/media/:id',
  url: `/api/builder/media/${id}`,
  headers: cookie ? { cookie } : {},
})

describe('GET /api/builder/media/<id>', () => {
  it('reads the asset at Django, as the staff member, never cached', async () => {
    const cookie = await signInBuilderStaff()
    backend.replyOnce(makeAsset({ id: 4 }))

    const response = await read(cookie)

    expect(response.status).toBe(200)
    expect(response.body).toEqual(makeAsset({ id: 4 }))
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/builder/media/4')
    expect(backend.lastRequest.headers.get('authorization')).toBe(`StaffBearer ${BUILDER_STAFF_TOKEN}`)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it('refuses an id that is not a number before it asks Django', async () => {
    const cookie = await signInBuilderStaff()
    const asked = backend.requests.length

    const response = await read(cookie, 'all')

    expect(response.status).toBe(400)
    expect(backend.requests).toHaveLength(asked)
  })

  it('answers the 404 of Django for an asset that is gone as it is', async () => {
    const cookie = await signInBuilderStaff()
    backend.replyOnce(jsonResponse({ detail: 'Not found.' }, 404))

    expect((await read(cookie)).status).toBe(404)
  })

  it('refuses a request without a staff session', async () => {
    const response = await read(undefined)

    expect(response.status).toBe(401)
    expect(backend.requests).toHaveLength(0)
  })
})
