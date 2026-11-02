import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/builder/link-labels.get'
import { BUILDER_STAFF_TOKEN, signInBuilderStaff } from '~~/test/helpers/builderStaff'
import { backend, callRoute } from '~~/test/helpers/nitro'

const route = '/api/builder/link-labels'

const labels = (url: string, cookie?: string) => callRoute(handler, { route, url, headers: cookie ? { cookie } : {} })

describe('GET /api/builder/link-labels', () => {
  it('asks Django for the names of the records named, in the editor\'s language, as the staff member', async () => {
    const cookie = await signInBuilderStaff()
    const answer = {
      product: { 12: { label: 'Φορτιστής 20W', active: true }, 99: { label: null, active: false } },
      category: { 3: { label: 'Καλώδια', active: false } },
    }
    backend.replyOnce(answer)

    const response = await labels(`${route}?product=12,99&category=3`, cookie)

    expect(response.status).toBe(200)
    expect(response.body).toEqual(answer)
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/builder/link-labels')
    expect(backend.lastRequest.query).toEqual({ product: '12,99', category: '3', locale: 'el' })
    expect(backend.lastRequest.headers.get('authorization')).toBe(`StaffBearer ${BUILDER_STAFF_TOKEN}`)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it('refuses a request without a staff session, and asks Django nothing', async () => {
    const response = await labels(`${route}?product=12`)

    expect(response.status).toBe(401)
    expect(backend.requests).toHaveLength(0)
  })
})
