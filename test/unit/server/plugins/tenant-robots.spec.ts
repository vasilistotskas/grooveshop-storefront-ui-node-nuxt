/**
 * Unit tests for server/plugins/tenant-robots.ts
 *
 * Regression guard: the plugin consumed getTenantConfig's result with
 * the WRONG union shape (`result.kind` / `result.tenant` instead of
 * `result.type` / `result.config`), so `isPrimary` was always false and
 * EVERY host — including each tenant's own primary production domain —
 * served a blanket `Disallow: /`. These tests pin the real contract:
 * primary hosts keep the module policy with a tenant-origin Sitemap
 * line; alias/unknown/error hosts get the full disallow.
 */
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetTenantConfig } = vi.hoisted(() => ({
  mockGetTenantConfig: vi.fn(),
}))

vi.mock('h3', () => ({
  getRequestHost: (event: { headers: Record<string, string> }) =>
    event.headers.host,
}))
vi.mock('../../../../server/utils/tenant', () => ({
  getTenantConfig: mockGetTenantConfig,
}))

let hook: (ctx: {
  e: { headers: Record<string, string> }
  robotsTxt: string
}) => Promise<void>

const PLATFORM_POLICY
  = 'User-agent: *\nDisallow: /account\n\nSitemap: https://platform.example/sitemap.xml\n'

beforeAll(async () => {
  vi.stubGlobal(
    'defineNitroPlugin',
    (fn: (app: unknown) => void) => fn,
  )
  const plugin = (await import('../../../../server/plugins/tenant-robots'))
    .default as unknown as (app: {
    hooks: { hook: (name: string, fn: typeof hook) => void }
  }) => void
  plugin({
    hooks: {
      hook: (_name, fn) => {
        hook = fn
      },
    },
  })
})

afterAll(() => vi.unstubAllGlobals())

beforeEach(() => mockGetTenantConfig.mockReset())

function makeCtx(host: string) {
  return { e: { headers: { host } }, robotsTxt: PLATFORM_POLICY }
}

describe('tenant-robots plugin', () => {
  it('keeps the platform policy and rewrites the Sitemap on the primary domain', async () => {
    mockGetTenantConfig.mockResolvedValue({
      type: 'ok',
      config: { primaryDomain: 'acme.example' },
    })
    const ctx = makeCtx('acme.example')
    await hook(ctx)
    expect(ctx.robotsTxt).toContain('Disallow: /account')
    expect(ctx.robotsTxt).not.toBe('User-agent: *\nDisallow: /\n')
    expect(ctx.robotsTxt).toContain('Sitemap: https://acme.example/sitemap.xml')
    expect(ctx.robotsTxt).not.toContain('platform.example')
  })

  it('strips the port before comparing against primaryDomain', async () => {
    mockGetTenantConfig.mockResolvedValue({
      type: 'ok',
      config: { primaryDomain: 'acme.example' },
    })
    const ctx = makeCtx('acme.example:3000')
    await hook(ctx)
    expect(ctx.robotsTxt).toContain('Sitemap: https://acme.example/sitemap.xml')
  })

  it('disallows everything on alias domains', async () => {
    mockGetTenantConfig.mockResolvedValue({
      type: 'ok',
      config: { primaryDomain: 'acme.example' },
    })
    const ctx = makeCtx('alias.example')
    await hook(ctx)
    expect(ctx.robotsTxt).toBe('User-agent: *\nDisallow: /\n')
  })

  it('disallows everything on unknown hosts', async () => {
    mockGetTenantConfig.mockResolvedValue({ type: 'not_found', config: null })
    const ctx = makeCtx('unknown.example')
    await hook(ctx)
    expect(ctx.robotsTxt).toBe('User-agent: *\nDisallow: /\n')
  })

  it('disallows everything on transient resolution errors', async () => {
    mockGetTenantConfig.mockResolvedValue({ type: 'error_5xx', config: null })
    const ctx = makeCtx('acme.example')
    await hook(ctx)
    expect(ctx.robotsTxt).toBe('User-agent: *\nDisallow: /\n')
  })

  it('treats an empty primaryDomain as primary (serves the policy)', async () => {
    mockGetTenantConfig.mockResolvedValue({
      type: 'ok',
      config: { primaryDomain: '' },
    })
    const ctx = makeCtx('acme.example')
    await hook(ctx)
    expect(ctx.robotsTxt).toContain('Disallow: /account')
    expect(ctx.robotsTxt).toContain('Sitemap: https://acme.example/sitemap.xml')
  })
})
