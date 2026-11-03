import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/builder/preview-links/[id].delete'
import { signInBuilderStaff } from '~~/test/helpers/builderStaff'
import { backend, callRoute, jsonResponse } from '~~/test/helpers/nitro'

const revoke = (cookie: string | undefined, id = '5') => callRoute(handler, {
  route: '/api/builder/preview-links/:id',
  url: `/api/builder/preview-links/${id}`,
  method: 'DELETE',
  headers: cookie ? { cookie } : {},
})

describe('DELETE /api/builder/preview-links/<id>', () => {
  it('revokes the link at Django', async () => {
    const cookie = await signInBuilderStaff()
    backend.replyOnce(new Response(null, { status: 204 }))

    const response = await revoke(cookie)

    expect(response.status).toBe(204)
    expect(backend.lastRequest).toMatchObject({ path: 'http://backend.test/api/v1/builder/preview-links/5', method: 'DELETE' })
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it('refuses an id that is not a number before it asks Django', async () => {
    const cookie = await signInBuilderStaff()
    const asked = backend.requests.length

    const response = await revoke(cookie, 'all')

    expect(response.status).toBe(400)
    expect(backend.requests).toHaveLength(asked)
  })

  it('answers the 404 of Django for a link that is not there as it is', async () => {
    const cookie = await signInBuilderStaff()
    backend.replyOnce(jsonResponse({ detail: 'Not found.' }, 404))

    const response = await revoke(cookie)

    expect(response.status).toBe(404)
  })

  it('refuses a request without a staff session', async () => {
    const response = await revoke(undefined)

    expect(response.status).toBe(401)
    expect(backend.requests).toHaveLength(0)
  })
})
