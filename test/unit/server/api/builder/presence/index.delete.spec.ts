import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/builder/presence/index.delete'
import { signInBuilderStaff } from '~~/test/helpers/builderStaff'
import { backend, callRoute } from '~~/test/helpers/nitro'

const leave = (cookie?: string) => callRoute(handler, {
  route: '/api/builder/presence',
  method: 'DELETE',
  headers: cookie ? { cookie } : {},
})

describe('DELETE /api/builder/presence', () => {
  it('lets go of every document of the staff member', async () => {
    const cookie = await signInBuilderStaff()
    backend.replyOnce(new Response(null, { status: 204 }))

    const response = await leave(cookie)

    expect(response.status).toBe(204)
    expect(backend.lastRequest).toMatchObject({ path: 'http://backend.test/api/v1/builder/presence', method: 'DELETE' })
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it('refuses a request without a staff session', async () => {
    const response = await leave()

    expect(response.status).toBe(401)
    expect(backend.requests).toHaveLength(0)
  })
})
