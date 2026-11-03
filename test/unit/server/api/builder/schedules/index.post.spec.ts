import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/builder/schedules/index.post'
import { BUILDER_STAFF_TOKEN, signInBuilderStaff } from '~~/test/helpers/builderStaff'
import { backend, callRoute, jsonResponse } from '~~/test/helpers/nitro'

const route = '/api/builder/schedules'
const schedule = (body: unknown, cookie?: string) => callRoute(handler, { route, method: 'POST', body, headers: cookie ? { cookie } : {} })

const SCHEDULE = {
  id: 3,
  scheduledFor: '2026-11-05T08:00:00Z',
  status: 'pending',
  documents: ['template:home'],
  note: '',
  scheduledBy: { id: 7, name: 'Maria Papadopoulou' },
  executedAt: null,
  release: 0,
  failure: null,
  acknowledgedAt: null,
}

describe('POST /api/builder/schedules', () => {
  it('schedules the named documents at the time given, as the staff member', async () => {
    const cookie = await signInBuilderStaff()
    backend.replyOnce(jsonResponse(SCHEDULE, 201))
    const body = { documents: ['template:home'], scheduledFor: '2026-11-05T08:00:00.000Z', note: 'Black Friday' }

    const response = await schedule(body, cookie)

    expect(response.status).toBe(200)
    expect(response.body).toEqual(SCHEDULE)
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/builder/schedules')
    expect(backend.lastRequest.method).toBe('POST')
    expect(backend.lastRequest.body).toEqual(body)
    expect(backend.lastRequest.headers.get('authorization')).toBe(`StaffBearer ${BUILDER_STAFF_TOKEN}`)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it('refuses a body with no time, and asks Django nothing', async () => {
    const cookie = await signInBuilderStaff()

    const response = await schedule({ documents: ['template:home'] }, cookie)

    expect(response.status).toBe(400)
    expect(backend.requests.map(request => request.path)).not.toContain('http://backend.test/api/v1/builder/schedules')
  })

  it('refuses a request without a staff session', async () => {
    const response = await schedule({ documents: ['template:home'], scheduledFor: '2026-11-05T08:00:00Z' })

    expect(response.status).toBe(401)
    expect(backend.requests).toHaveLength(0)
  })
})
