/**
 * Unit tests for server/plugins/sitemap-tenant-gate.ts
 *
 * The sitemap's static routes come from a build-time manifest with no
 * tenant context, so a feature-gated page (whose route middleware hard
 * 404s when the feature is off) was advertised to every tenant. This
 * plugin removes those URLs per tenant at request time.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubGlobal('useRuntimeConfig', () => ({
  apiBaseUrl: 'https://api.example.com/api/v1',
}))

vi.stubGlobal('getRequestHost', () => 'example.com')

const getTenantConfigMock = vi.fn()
vi.stubGlobal('getTenantConfig', getTenantConfigMock)

const settingsMock = vi.fn(async (_key?: string) => ({ value: 'false' }))
vi.stubGlobal('$fetch', (url: string, opts: { query?: { key?: string } }) => {
  if (url.includes('/settings/get')) return settingsMock(opts?.query?.key)
  throw new Error(`unexpected $fetch: ${url}`)
})

// Capture the hook the plugin registers so we can drive it directly.
let resolvedHook: ((ctx: any) => Promise<void>) | undefined
vi.stubGlobal('defineNitroPlugin', (fn: (app: any) => void) => {
  fn({
    hooks: {
      hook: (name: string, handler: (ctx: any) => Promise<void>) => {
        if (name === 'sitemap:resolved') resolvedHook = handler
      },
    },
  })
  return fn
})

await import('../../../../server/plugins/sitemap-tenant-gate')

const ALL_URLS = [
  { loc: 'https://example.com/' },
  { loc: 'https://example.com/loyalty-program' },
  { loc: 'https://example.com/products' },
]

async function run(tenant: Record<string, unknown> | null) {
  const ctx = {
    urls: [...ALL_URLS],
    sitemapName: 'sitemap',
    event: { context: tenant ? { tenant } : {} },
  }
  await resolvedHook!(ctx)
  return ctx.urls.map(u => u.loc)
}

describe('sitemap-tenant-gate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    settingsMock.mockResolvedValue({ value: 'false' })
  })

  it('registers the sitemap:resolved hook', () => {
    expect(resolvedHook).toBeTypeOf('function')
  })

  it('drops a gated route when the tenant plan flag is off', async () => {
    const locs = await run({ loyaltyEnabled: false })

    expect(locs).not.toContain('https://example.com/loyalty-program')
    // Ungated URLs are untouched.
    expect(locs).toContain('https://example.com/products')
    expect(locs).toContain('https://example.com/')
    // The plan gate short-circuits before any settings lookup.
    expect(settingsMock).not.toHaveBeenCalled()
  })

  it('drops a gated route when the plan flag is on but the runtime setting is false', async () => {
    // Exactly the webside.gr state that put a 404 in the sitemap.
    const locs = await run({ loyaltyEnabled: true })

    expect(settingsMock).toHaveBeenCalledWith('LOYALTY_ENABLED')
    expect(locs).not.toContain('https://example.com/loyalty-program')
  })

  it('keeps a gated route when both gates pass', async () => {
    settingsMock.mockResolvedValue({ value: 'True' })

    const locs = await run({ loyaltyEnabled: true })

    expect(locs).toContain('https://example.com/loyalty-program')
  })

  it('fails closed when the settings lookup errors', async () => {
    settingsMock.mockRejectedValue(new Error('backend down'))

    const locs = await run({ loyaltyEnabled: true })

    expect(locs).not.toContain('https://example.com/loyalty-program')
  })

  it('resolves the tenant itself when the sitemap route bypassed tenant middleware', async () => {
    getTenantConfigMock.mockResolvedValueOnce({
      type: 'ok',
      config: { loyaltyEnabled: false },
    })

    const locs = await run(null)

    expect(getTenantConfigMock).toHaveBeenCalledWith('example.com')
    expect(locs).not.toContain('https://example.com/loyalty-program')
  })

  it('matches the gated path through a locale prefix', async () => {
    const ctx = {
      urls: [
        { loc: '/el/loyalty-program' },
        { loc: '/en/loyalty-program' },
        { loc: '/products' },
      ],
      sitemapName: 'sitemap',
      event: { context: { tenant: { loyaltyEnabled: false } } },
    }
    await resolvedHook!(ctx)

    expect(ctx.urls.map(u => u.loc)).toEqual(['/products'])
  })

  it('leaves the sitemap untouched when the tenant cannot be resolved', async () => {
    getTenantConfigMock.mockResolvedValueOnce({ type: 'not_found', config: null })

    const locs = await run(null)

    expect(locs).toEqual(ALL_URLS.map(u => u.loc))
  })
})
