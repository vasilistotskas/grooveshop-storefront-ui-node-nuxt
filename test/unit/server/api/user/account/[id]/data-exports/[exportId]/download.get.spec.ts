import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/user/account/[id]/data-exports/[exportId]/download.get'
import { backend, callRoute, jsonResponse, testSession } from '~~/test/helpers/nitro'

/**
 * GET /api/user/account/:id/data-exports/:exportId/download: Django streams a
 * shopper's data export to its owner; the route passes the bytes on as an
 * attachment, with the token from the session, and keeps Django's refusals.
 */

const BUNDLE = '{"profile":"theirs"}'

function download(id: number | string = 7, exportId: number | string = 3) {
  return callRoute(handler, {
    route: '/api/user/account/:id/data-exports/:exportId/download',
    url: `/api/user/account/${id}/data-exports/${exportId}/download`,
  })
}

describe('GET /api/user/account/:id/data-exports/:exportId/download', () => {
  it('sends Django\'s bundle as an attachment, with the session\'s token', async () => {
    testSession.set({ user: { id: 7 }, secure: { accessToken: 'knox-1' } })
    backend.reply(new Response(BUNDLE, { status: 200, headers: { 'content-type': 'application/json' } }))

    const response = await download()

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/json')
    expect(response.headers.get('content-disposition')).toBe('attachment; filename="data-export-3.json"')
    expect(response.body).toEqual(JSON.parse(BUNDLE))
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/user/account/7/data_exports/3/download')
    expect(backend.lastRequest.headers.get('authorization')).toBe('Bearer knox-1')
  })

  it('refuses a visitor with no session without calling Django', async () => {
    const response = await download()

    expect(response.status).toBe(401)
    expect(backend.requests).toEqual([])
  })

  it('rejects a malformed id without calling Django', async () => {
    testSession.set({ user: { id: 7 }, secure: { accessToken: 'knox-1' } })

    expect((await download('abc')).status).toBe(400)
    expect((await download(7, 'abc')).status).toBe(400)
    expect(backend.requests).toEqual([])
  })

  it.each([401, 404, 410])('keeps Django\'s %i', async (status) => {
    testSession.set({ user: { id: 7 }, secure: { accessToken: 'knox-1' } })
    backend.reply(jsonResponse({ detail: 'refused', code: 'download_expired' }, status))

    const response = await download()

    expect(response.status).toBe(status)
  })

  it('answers 502 when Django sends no bytes', async () => {
    testSession.set({ user: { id: 7 }, secure: { accessToken: 'knox-1' } })
    backend.reply(new Response('', { status: 200, headers: { 'content-type': 'application/json' } }))

    expect((await download()).status).toBe(502)
  })
})
