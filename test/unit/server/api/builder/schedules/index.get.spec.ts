import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/builder/schedules/index.get'
import { BUILDER_STAFF_TOKEN, signInBuilderStaff } from '~~/test/helpers/builderStaff'
import { backend, callRoute } from '~~/test/helpers/nitro'

const route = '/api/builder/schedules'

const page = {
  count: 1,
  results: [{ id: 3, scheduledFor: '2026-11-05T08:00:00Z', status: 'pending', documents: ['template:home'], note: 'Sale', scheduledBy: { id: 7, name: 'Maria Papadopoulou' }, executedAt: null, release: null, failure: null, acknowledgedAt: null }],
}

const list = (cookie: string | undefined, query = '') => callRoute(handler, { route, url: `/api/builder/schedules${query}`, headers: cookie ? { cookie } : {} })

describe('GET /api/builder/schedules', () => {
  it('answers the schedules in the state asked for, as the staff member', async () => {
    const cookie = await signInBuilderStaff()
    backend.replyOnce(page)

    const response = await list(cookie, '?status=pending')

    expect(response.status).toBe(200)
    expect(response.body).toEqual(page)
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/builder/schedules')
    expect(backend.lastRequest.query).toEqual({ status: 'pending' })
    expect(backend.lastRequest.headers.get('authorization')).toBe(`StaffBearer ${BUILDER_STAFF_TOKEN}`)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it('refuses a state Django does not have before it asks Django', async () => {
    const cookie = await signInBuilderStaff()
    const asked = backend.requests.length

    const response = await list(cookie, '?status=lost')

    expect(response.status).toBe(400)
    expect(backend.requests).toHaveLength(asked)
  })

  it('refuses a request without a staff session', async () => {
    const response = await list(undefined)

    expect(response.status).toBe(401)
  })
})
