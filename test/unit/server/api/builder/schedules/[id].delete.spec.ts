import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/builder/schedules/[id].delete'
import { BUILDER_STAFF_TOKEN, signInBuilderStaff } from '~~/test/helpers/builderStaff'
import { backend, callRoute, jsonResponse } from '~~/test/helpers/nitro'

const route = '/api/builder/schedules/:id'
const cancel = (id: string, cookie?: string) => callRoute(handler, { route, url: `/api/builder/schedules/${id}`, method: 'DELETE', headers: cookie ? { cookie } : {} })

const CANCELLED = { id: 3, scheduledFor: '2026-11-05T08:00:00Z', status: 'cancelled', documents: ['template:home'], note: '', scheduledBy: null, executedAt: null, release: null, failure: null, acknowledgedAt: null }

describe('DELETE /api/builder/schedules/:id', () => {
  it('cancels the schedule, as the staff member', async () => {
    const cookie = await signInBuilderStaff()
    backend.replyOnce(CANCELLED)

    const response = await cancel('3', cookie)

    expect(response.status).toBe(200)
    expect(response.body).toEqual(CANCELLED)
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/builder/schedules/3')
    expect(backend.lastRequest.method).toBe('DELETE')
    expect(backend.lastRequest.headers.get('authorization')).toBe(`StaffBearer ${BUILDER_STAFF_TOKEN}`)
  })

  it('refuses an id that is not a number, and asks Django nothing', async () => {
    const cookie = await signInBuilderStaff()

    const response = await cancel('x', cookie)

    expect(response.status).toBe(400)
    expect(backend.requests.map(request => request.path)).not.toContain('http://backend.test/api/v1/builder/schedules/x')
  })

  it('returns Django\'s refusal of a schedule that has already run', async () => {
    const cookie = await signInBuilderStaff()
    backend.replyOnce(jsonResponse({ detail: 'It has already run.', code: 'schedule_not_pending' }, 409))

    const response = await cancel('3', cookie)

    expect(response.status).toBe(409)
    expect(response.body).toEqual({ detail: 'It has already run.', code: 'schedule_not_pending' })
  })
})
