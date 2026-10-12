import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/orders/[id]/cancel.post'
import { makeOrder } from '~~/test/fixtures/order'
import { backend, callRoute, jsonResponse } from '~~/test/helpers/nitro'

/**
 * POST /api/orders/:id/cancel: the customer's cancel. A refusal RETURNS
 * Django's body, because its `error.type` is what the order page
 * explains (400 `parcel_with_courier`, 503 `courier_unreachable`); a
 * thrown error's body is stripped in production. Any other 5xx body is
 * never forwarded.
 */

function cancel(id = 3) {
  return callRoute(handler, {
    route: '/api/orders/:id/cancel',
    url: `/api/orders/${id}/cancel`,
    method: 'POST',
    body: {},
  })
}

describe('POST /api/orders/:id/cancel', () => {
  it('asks Django to cancel the order and returns it', async () => {
    const canceled = makeOrder({ id: 3, status: 'CANCELED', canBeCanceled: false })
    backend.reply(canceled)

    const response = await cancel()

    expect(response.status).toBe(200)
    expect(response.body).toEqual(canceled)
    expect(backend.lastRequest.path).toMatch(/\/order\/3\/cancel$/)
    expect(backend.lastRequest.method).toBe('POST')
  })

  it('returns a refusal with Django\'s status and body, so error.type reaches the page', async () => {
    const refusal = {
      detail: 'Your parcel is already with the courier.',
      error: { type: 'parcel_with_courier' },
    }
    backend.reply(jsonResponse(refusal, 400))

    const response = await cancel()

    expect(response.status).toBe(400)
    expect(response.body).toEqual(refusal)
  })

  it('returns the courier_unreachable 503 with Django\'s body, so the page asks to try again', async () => {
    const unreachable = {
      detail: 'We could not reach the courier.',
      error: { type: 'courier_unreachable' },
    }
    backend.reply(jsonResponse(unreachable, 503))

    const response = await cancel()

    expect(response.status).toBe(503)
    expect(response.body).toEqual(unreachable)
  })

  it('throws any other 5xx without forwarding Django\'s body', async () => {
    backend.reply(jsonResponse({ detail: 'courier client crashed at /internal' }, 500))

    const response = await cancel()

    expect(response.status).toBe(500)
    expect(JSON.stringify(response.body)).not.toContain('/internal')
  })
})
