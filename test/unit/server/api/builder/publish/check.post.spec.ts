import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/builder/publish/check.post'
import { BUILDER_STAFF_TOKEN, signInBuilderStaff } from '~~/test/helpers/builderStaff'
import { backend, callRoute } from '~~/test/helpers/nitro'

const route = '/api/builder/publish/check'
const check = (body: unknown, cookie?: string) => callRoute(handler, { route, method: 'POST', body, headers: cookie ? { cookie } : {} })

const ANSWER = {
  ok: false,
  changed: ['template:home'],
  problems: [{ document: 'template:home', path: '/sections/grid/settings/ctaLink', code: 'reference_not_found', message: 'Product 12 does not exist in this store.', params: { kind: 'Product', target: '12' } }],
}

describe('POST /api/builder/publish/check', () => {
  it('asks Django what publishing the named documents would do, as the staff member', async () => {
    const cookie = await signInBuilderStaff()
    backend.replyOnce(ANSWER)

    const response = await check({ documents: ['template:home', 'group:header'] }, cookie)

    expect(response.status).toBe(200)
    expect(response.body).toEqual(ANSWER)
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/builder/publish/check')
    expect(backend.lastRequest.method).toBe('POST')
    expect(backend.lastRequest.body).toEqual({ documents: ['template:home', 'group:header'], note: '' })
    expect(backend.lastRequest.headers.get('authorization')).toBe(`StaffBearer ${BUILDER_STAFF_TOKEN}`)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it('refuses a request without a staff session', async () => {
    const response = await check({ documents: ['template:home'] })

    expect(response.status).toBe(401)
    expect(backend.requests).toHaveLength(0)
  })
})
