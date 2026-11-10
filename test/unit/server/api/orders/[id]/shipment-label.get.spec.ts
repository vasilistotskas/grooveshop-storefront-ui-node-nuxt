import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/orders/[id]/shipment-label.get'
import { backend, callRoute } from '~~/test/helpers/nitro'

/**
 * GET /api/orders/[id]/shipment-label.
 *
 * One route for every carrier: Django's `shipment_label` dispatches on the
 * order's shipping provider, so the storefront no longer names the carrier.
 */

const route = '/api/orders/:id/shipment-label'
const PDF = '%PDF-1.4 label'

const download = (id = '7') => callRoute(handler, { route, url: `/api/orders/${id}/shipment-label` })

describe('GET /api/orders/[id]/shipment-label', () => {
  it('streams the PDF Django serves, as an attachment', async () => {
    backend.reply(new Response(PDF, { headers: { 'content-type': 'application/pdf' } }))

    const response = await download()

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/pdf')
    expect(response.headers.get('content-disposition')).toBe('attachment; filename="shipping-label-7.pdf"')
    expect(response.body).toBe(PDF)
    expect(backend.lastRequest.method).toBe('GET')
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/order/7/shipment_label')
  })

  it('rejects a non-numeric order id without calling Django', async () => {
    const response = await download('abc')

    expect(response.status).toBe(400)
    expect(backend.requests).toEqual([])
  })
})
