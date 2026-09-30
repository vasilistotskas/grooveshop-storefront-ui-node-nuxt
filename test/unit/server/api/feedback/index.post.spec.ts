import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/feedback/index.post'
import { zCreateFeedbackResponse } from '~~/shared/openapi/zod.gen'
import { backend, callRoute, jsonResponse } from '~~/test/helpers/nitro'

const route = '/api/feedback'

const VALID_BODY = {
  rating: 5,
  category: 'products',
  message: 'The checkout was smooth and the delivery arrived early.',
  name: 'Maria',
  email: 'maria@example.com',
}

const created = zCreateFeedbackResponse.parse({
  id: 1,
  uuid: '550e8400-e29b-41d4-a716-446655440000',
  createdAt: '2026-09-01T10:00:00+03:00',
  updatedAt: '2026-09-01T10:00:00+03:00',
  ...VALID_BODY,
})

const post = (body: unknown) => callRoute(handler, {
  route,
  method: 'POST',
  body,
  headers: { 'x-forwarded-host': 'evil.example' },
})

describe('POST /api/feedback', () => {
  it('forwards a valid submission to the store\'s backend and returns the created row', async () => {
    backend.reply(created)

    const response = await post(VALID_BODY)

    expect(response.status).toBe(200)
    expect(response.body).toEqual(created)
    expect(backend.lastRequest).toMatchObject({
      path: 'http://backend.test/api/v1/feedback',
      method: 'POST',
      body: VALID_BODY,
    })
    // The row must land in THIS store's schema, whatever the caller claims.
    expect(backend.lastRequest.headers.get('x-forwarded-host')).toBe('shop.test')
  })

  it('accepts anonymous feedback (empty email)', async () => {
    const anonymous = { rating: 4, category: 'general', message: 'Nice store overall, keep it up team.', email: '' }
    backend.reply({ ...created, ...anonymous, name: undefined })

    const response = await post(anonymous)

    expect(response.status).toBe(200)
    expect(backend.lastRequest.body).toEqual(anonymous)
  })

  it('returns Django\'s 4xx body with its status, so the client can show what was rejected', async () => {
    backend.reply(jsonResponse({ nonFieldErrors: ['spam'] }, 400))

    const response = await post(VALID_BODY)

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ nonFieldErrors: ['spam'] })
  })

  it('rejects an out-of-range rating before calling the backend', async () => {
    const response = await post({ ...VALID_BODY, rating: 9 })

    expect(response.status).toBe(400)
    expect(backend.requests).toEqual([])
  })
})
