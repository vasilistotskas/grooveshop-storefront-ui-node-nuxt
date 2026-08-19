/**
 * Tenant gating of the platform's static icon files. Browsers request
 * `/favicon.ico` unprompted, so head-link gating alone cannot stop a
 * tenant's domain from serving the PLATFORM'S brand bytes — this
 * middleware must 404 unbranded tenants, redirect branded ones, and
 * fall through (static file) only for the platform / unknown hosts.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const state: {
  tenantResult: unknown
  isPlatform: boolean
  redirects: Array<{ to: string, code?: number }>
  status: number[]
  headers: Record<string, string>
} = {
  tenantResult: { type: 'ok', config: {} },
  isPlatform: false,
  redirects: [],
  status: [],
  headers: {},
}

vi.stubGlobal('defineEventHandler', (fn: (event: unknown) => unknown) => fn)
vi.stubGlobal('getRequestHost', () => 'tenant.example')
vi.stubGlobal('getTenantConfig', async () => state.tenantResult)
vi.stubGlobal('isPlatformTenantConfig', () => state.isPlatform)
vi.stubGlobal('sendRedirect', (_e: unknown, to: string, code?: number) => {
  state.redirects.push({ to, code })
  return 'redirected'
})
vi.stubGlobal('setResponseStatus', (_e: unknown, code: number) => {
  state.status.push(code)
})
vi.stubGlobal('setResponseHeader', (_e: unknown, name: string, value: string) => {
  state.headers[name] = value
})

const module = await import('../../../../server/middleware/6.tenant-favicon')
const handler = (module.default ?? module) as unknown as (event: { path: string }) => Promise<unknown>

beforeEach(() => {
  state.tenantResult = { type: 'ok', config: {} }
  state.isPlatform = false
  state.redirects = []
  state.status = []
  state.headers = {}
})

describe('6.tenant-favicon middleware', () => {
  it('ignores non-icon paths', async () => {
    await handler({ path: '/products' })
    expect(state.status).toEqual([])
    expect(state.redirects).toEqual([])
  })

  it('falls through for the platform tenant (static file serves)', async () => {
    state.isPlatform = true
    const result = await handler({ path: '/favicon.ico' })
    expect(result).toBeUndefined()
    expect(state.status).toEqual([])
  })

  it('falls through when the host does not resolve to a tenant', async () => {
    state.tenantResult = { type: 'notfound' }
    const result = await handler({ path: '/favicon.ico' })
    expect(result).toBeUndefined()
  })

  it('redirects a branded tenant to its own favicon', async () => {
    state.tenantResult = { type: 'ok', config: { faviconUrl: 'https://assets.tenant.example/fav.png' } }
    await handler({ path: '/favicon.ico' })
    expect(state.redirects).toEqual([
      { to: 'https://assets.tenant.example/fav.png', code: 302 },
    ])
    expect(state.headers['Cache-Control']).toBe('public, max-age=3600')
  })

  it('404s an unbranded tenant on every icon path (never platform brand bytes)', async () => {
    for (const path of ['/favicon.ico', '/favicon.png', '/logo.svg', '/favicon/apple-touch-icon.png']) {
      await handler({ path })
    }
    expect(state.status).toEqual([404, 404, 404, 404])
    expect(state.headers['Cache-Control']).toBe('public, max-age=3600')
  })
})
