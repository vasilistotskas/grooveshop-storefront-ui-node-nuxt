import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/builder/schedules/[id]/acknowledge.post'
import { BUILDER_STAFF_TOKEN, signInBuilderStaff } from '~~/test/helpers/builderStaff'
import { backend, callRoute } from '~~/test/helpers/nitro'

const route = '/api/builder/schedules/:id/acknowledge'
const acknowledge = (id: string, cookie?: string) => callRoute(handler, { route, url: `/api/builder/schedules/${id}/acknowledge`, method: 'POST', headers: cookie ? { cookie } : {} })

const SEEN = { id: 3, scheduledFor: '2026-11-05T08:00:00Z', status: 'failed', documents: ['template:home'], note: '', scheduledBy: null, executedAt: '2026-11-05T08:00:05Z', release: null, failure: { problems: [] }, acknowledgedAt: '2026-11-05T09:00:00Z' }

describe('POST /api/builder/schedules/:id/acknowledge', () => {
  it('says the failed schedule was seen, as the staff member', async () => {
    const cookie = await signInBuilderStaff()
    backend.replyOnce(SEEN)

    const response = await acknowledge('3', cookie)

    expect(response.status).toBe(200)
    expect(response.body).toEqual(SEEN)
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/builder/schedules/3/acknowledge')
    expect(backend.lastRequest.method).toBe('POST')
    expect(backend.lastRequest.headers.get('authorization')).toBe(`StaffBearer ${BUILDER_STAFF_TOKEN}`)
  })

  it('refuses a request without a staff session', async () => {
    const response = await acknowledge('3')

    expect(response.status).toBe(401)
    expect(backend.requests).toHaveLength(0)
  })
})
