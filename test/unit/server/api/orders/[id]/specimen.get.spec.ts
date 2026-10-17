import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/orders/[id]/specimen.get'
import { backend, callRoute, jsonResponse, testSession } from '~~/test/helpers/nitro'

/**
 * GET /api/orders/:id/specimen: the demo store's watermarked specimen
 * receipt. Django streams the PDF; the route passes the bytes on as an
 * attachment, forwards the shopper's session or the guest's uuid, and
 * keeps Django's 403, 404 and 429.
 */

const GUEST_UUID = '0b8e2d1c-5f6a-4c3e-9d7a-1e2f3a4b5c6d'
const PDF = '%PDF-1.7 specimen'

const pdf = () => new Response(PDF, { status: 200, headers: { 'content-type': 'application/pdf' } })

function download(id: number | string = 3, query = '') {
  return callRoute(handler, {
    route: '/api/orders/:id/specimen',
    url: `/api/orders/${id}/specimen${query}`,
  })
}

describe('GET /api/orders/:id/specimen', () => {
  it('sends Django\'s PDF as the specimen attachment', async () => {
    backend.reply(pdf())

    const response = await download()

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/pdf')
    expect(response.headers.get('content-disposition')).toBe('attachment; filename="specimen-3.pdf"')
    expect(response.body).toBe(PDF)
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/order/3/specimen/download')
    expect(backend.lastRequest.method).toBe('GET')
  })

  it('forwards the signed-in shopper\'s token', async () => {
    testSession.set({ secure: { accessToken: 'knox-1' } })
    backend.reply(pdf())

    await download()

    expect(backend.lastRequest.headers.get('authorization')).toBe('Bearer knox-1')
  })

  it('forwards a guest\'s uuid and sends no token', async () => {
    backend.reply(pdf())

    await download(3, `?uuid=${GUEST_UUID}`)

    expect(backend.lastRequest.query).toEqual({ uuid: GUEST_UUID })
    expect(backend.lastRequest.headers.get('authorization')).toBeNull()
  })

  it('rejects a malformed uuid or order id without calling Django', async () => {
    expect((await download(3, '?uuid=not-a-uuid')).status).toBe(400)
    expect((await download('abc')).status).toBe(400)
    expect(backend.requests).toEqual([])
  })

  it.each([403, 404, 429])('keeps Django\'s %i', async (status) => {
    backend.reply(jsonResponse({ detail: 'refused' }, status))

    const response = await download()

    expect(response.status).toBe(status)
  })

  it('answers 502 when Django sends no body', async () => {
    backend.reply(new Response(null, { status: 200, headers: { 'content-type': 'application/pdf' } }))

    const response = await download()

    expect(response.status).toBe(502)
  })
})
