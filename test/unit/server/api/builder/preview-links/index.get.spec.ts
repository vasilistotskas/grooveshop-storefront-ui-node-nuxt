import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/builder/preview-links/index.get'
import { signInBuilderStaff } from '~~/test/helpers/builderStaff'
import { backend, callRoute } from '~~/test/helpers/nitro'

const links = [{
  id: 5,
  documents: ['group:header', 'template:home'],
  note: '',
  createdBy: null,
  createdAt: '2026-11-03T10:00:00+02:00',
  expiresAt: '2026-11-10T10:00:00+02:00',
}]

const list = (cookie?: string) => callRoute(handler, { route: '/api/builder/preview-links', headers: cookie ? { cookie } : {} })

describe('GET /api/builder/preview-links', () => {
  it('lists the links that still open, with no token', async () => {
    const cookie = await signInBuilderStaff()
    backend.replyOnce(links)

    const response = await list(cookie)

    expect(response.status).toBe(200)
    expect(response.body).toEqual(links)
    expect(JSON.stringify(response.body)).not.toContain('token')
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it('refuses a request without a staff session', async () => {
    const response = await list()

    expect(response.status).toBe(401)
    expect(backend.requests).toHaveLength(0)
  })
})
