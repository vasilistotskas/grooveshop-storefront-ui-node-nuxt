import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/builder/media/[id].delete'
import { BUILDER_STAFF_TOKEN, signInBuilderStaff } from '~~/test/helpers/builderStaff'
import { backend, callRoute, jsonResponse } from '~~/test/helpers/nitro'

const remove = (cookie: string | undefined, id = '4') => callRoute(handler, {
  route: '/api/builder/media/:id',
  url: `/api/builder/media/${id}`,
  method: 'DELETE',
  headers: cookie ? { cookie } : {},
})

describe('DELETE /api/builder/media/<id>', () => {
  it('deletes the asset at Django as the staff member, never cached', async () => {
    const cookie = await signInBuilderStaff()
    backend.replyOnce(new Response(null, { status: 204 }))

    const response = await remove(cookie)

    expect(response.status).toBe(204)
    expect(backend.lastRequest).toMatchObject({ path: 'http://backend.test/api/v1/builder/media/4', method: 'DELETE' })
    expect(backend.lastRequest.headers.get('authorization')).toBe(`StaffBearer ${BUILDER_STAFF_TOKEN}`)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it('returns the 409 media_in_use of Django as it is, with the documents that use the image', async () => {
    const cookie = await signInBuilderStaff()
    const inUse = { detail: 'The image is used by a published page.', code: 'media_in_use', usedBy: ['page:home', 'page:about'] }
    backend.replyOnce(jsonResponse(inUse, 409))

    const response = await remove(cookie)

    expect(response.status).toBe(409)
    expect(response.body).toEqual(inUse)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it('refuses an id that is not a number before it asks Django', async () => {
    const cookie = await signInBuilderStaff()
    const asked = backend.requests.length

    expect((await remove(cookie, 'all')).status).toBe(400)
    expect(backend.requests).toHaveLength(asked)
  })

  it('refuses a request without a staff session', async () => {
    const response = await remove(undefined)

    expect(response.status).toBe(401)
    expect(backend.requests).toHaveLength(0)
  })
})
