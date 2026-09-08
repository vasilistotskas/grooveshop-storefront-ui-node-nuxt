/**
 * Unit tests for server/plugins/sitemap-tenant-gate.ts
 *
 * The sitemap's static routes come from a build-time manifest with no
 * tenant context, so a feature-gated page (whose route middleware hard
 * 404s when the feature is off) was advertised to every tenant. This
 * plugin removes those URLs per tenant at request time.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { settingEnabledForHost } from '../../../../server/utils/tenantSetting'

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

// `settingEnabledForHost` is a Nitro auto-import in the plugin. The
// real one is stubbed in (rather than a fake) so these tests still
// exercise its truthiness parsing and its fail-CLOSED branch.
vi.stubGlobal('settingEnabledForHost', settingEnabledForHost)

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
  { loc: 'https://example.com/blog' },
  { loc: 'https://example.com/contact' },
]

/** A tenant with every gated surface ON, to vary one at a time. */
const OPEN = { loyaltyEnabled: true, blogEnabled: true }

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
    const locs = await run({ ...OPEN, loyaltyEnabled: false })

    expect(locs).not.toContain('https://example.com/loyalty-program')
    // Ungated URLs are untouched.
    expect(locs).toContain('https://example.com/contact')
    expect(locs).toContain('https://example.com/')
    // The plan gate short-circuits before ITS settings lookup.
    expect(settingsMock).not.toHaveBeenCalledWith('LOYALTY_ENABLED')
  })

  it('drops the catalogue when the merchant setting is off', async () => {
    // One tier, not two: a store can hold a product model and serve no
    // shop, which is not a plan the platform sells or withholds.
    const locs = await run(OPEN)

    expect(settingsMock).toHaveBeenCalledWith('CATALOGUE_ENABLED')
    expect(locs).not.toContain('https://example.com/products')
  })

  it('keeps the catalogue when the merchant setting is on', async () => {
    settingsMock.mockResolvedValue({ value: 'True' })

    const locs = await run(OPEN)

    expect(locs).toContain('https://example.com/products')
  })

  it('drops the blog index on the plan flag alone', async () => {
    // No extra_settings counterpart exists for the blog: the flag is
    // the sole gate, and `middleware/blog-enabled.ts` reads it too.
    const locs = await run({ ...OPEN, blogEnabled: false })

    expect(locs).not.toContain('https://example.com/blog')
    expect(settingsMock).not.toHaveBeenCalledWith('BLOG_ENABLED')
  })

  it('keeps the blog index without consulting any setting', async () => {
    const ctx = {
      urls: [{ loc: '/blog' }, { loc: '/blog/categories' }],
      sitemapName: 'sitemap',
      event: { context: { tenant: OPEN } },
    }
    await resolvedHook!(ctx)

    expect(ctx.urls.map(u => u.loc)).toEqual(['/blog', '/blog/categories'])
  })

  it('drops a gated route when the plan flag is on but the runtime setting is false', async () => {
    // Exactly the webside.gr state that put a 404 in the sitemap.
    const locs = await run(OPEN)

    expect(settingsMock).toHaveBeenCalledWith('LOYALTY_ENABLED')
    expect(locs).not.toContain('https://example.com/loyalty-program')
  })

  it('keeps a gated route when both gates pass', async () => {
    settingsMock.mockResolvedValue({ value: 'True' })

    const locs = await run(OPEN)

    expect(locs).toContain('https://example.com/loyalty-program')
  })

  it('fails closed when the settings lookup errors', async () => {
    settingsMock.mockRejectedValue(new Error('backend down'))

    const locs = await run(OPEN)

    expect(locs).not.toContain('https://example.com/loyalty-program')
  })

  it('resolves the tenant itself when the sitemap route bypassed tenant middleware', async () => {
    getTenantConfigMock.mockResolvedValueOnce({
      type: 'ok',
      config: { ...OPEN, loyaltyEnabled: false },
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
        { loc: '/contact' },
      ],
      sitemapName: 'sitemap',
      event: { context: { tenant: { ...OPEN, loyaltyEnabled: false } } },
    }
    await resolvedHook!(ctx)

    expect(ctx.urls.map(u => u.loc)).toEqual(['/contact'])
  })

  it('leaves the sitemap untouched when the tenant cannot be resolved', async () => {
    getTenantConfigMock.mockResolvedValueOnce({ type: 'not_found', config: null })

    const locs = await run(null)

    expect(locs).toEqual(ALL_URLS.map(u => u.loc))
  })

  describe('locale gate', () => {
    /**
     * `sitemaps: false` only suppresses the per-locale sitemap SPLIT —
     * @nuxtjs/sitemap still adds the locale-prefixed entries and their
     * hreflang alternates from the BUILD-TIME i18n config, which is
     * platform-wide. Availability is per tenant, so a Greek-only store
     * would advertise the `/en/**` URLs its own route guard 404s.
     */
    async function runLocales(
      tenant: Record<string, unknown>,
      urls: Array<Record<string, unknown>>,
    ) {
      const ctx = {
        urls: [...urls],
        sitemapName: 'sitemap',
        event: {
          context: { tenant: { ...OPEN, loyaltyEnabled: false, ...tenant } },
        },
      }
      await resolvedHook!(ctx)
      return ctx.urls as Array<Record<string, any>>
    }

    const GREEK_ONLY = { defaultLocale: 'el', availableLocales: [] }
    const BILINGUAL = { defaultLocale: 'el', availableLocales: ['el', 'en'] }

    it('drops the prefixed locale a single-language tenant does not serve', async () => {
      const urls = await runLocales(GREEK_ONLY, [
        { loc: '/' },
        { loc: '/contact' },
        { loc: '/en' },
        { loc: '/en/contact' },
      ])

      expect(urls.map(u => u.loc)).toEqual(['/', '/contact'])
    })

    it('keeps both locales for a bilingual tenant', async () => {
      const urls = await runLocales(BILINGUAL, [
        { loc: '/contact' },
        { loc: '/en/contact' },
      ])

      expect(urls.map(u => u.loc)).toEqual(['/contact', '/en/contact'])
    })

    it('drops an alternate that points at an unserved locale', async () => {
      const urls = await runLocales({
        defaultLocale: 'el',
        availableLocales: ['el', 'en'],
      }, [
        {
          loc: '/contact',
          alternatives: [
            { hreflang: 'el-GR', href: '/contact' },
            { hreflang: 'en-US', href: '/en/contact' },
            { hreflang: 'de-DE', href: '/de/contact' },
            { hreflang: 'x-default', href: '/contact' },
          ],
        },
      ])

      expect(urls[0]!.alternatives.map((a: any) => a.hreflang)).toEqual([
        'el-GR',
        'en-US',
        'x-default',
      ])
    })

    it('drops the alternates entirely for a single-language tenant', async () => {
      // A lone self-referential hreflang says nothing; it is noise in
      // every crawler's eyes.
      const urls = await runLocales(GREEK_ONLY, [
        {
          loc: '/contact',
          alternatives: [
            { hreflang: 'el-GR', href: '/contact' },
            { hreflang: 'en-US', href: '/en/contact' },
          ],
        },
      ])

      expect(urls).toHaveLength(1)
      expect(urls[0]!.alternatives).toBeUndefined()
    })

    it('does not mistake a two-letter route for a locale prefix', async () => {
      // `/eu` is a path, not a locale. Matching "any two letters" would
      // gate a legitimate page out of every single-language sitemap AND
      // strip the segment before the gated-route lookup, so
      // `/eu/loyalty-program` would be dropped as `/loyalty-program`.
      const urls = await runLocales(GREEK_ONLY, [
        { loc: '/eu' },
        { loc: '/eu/policy' },
        { loc: '/eu/loyalty-program' },
      ])

      expect(urls.map(u => u.loc)).toEqual([
        '/eu',
        '/eu/policy',
        '/eu/loyalty-program',
      ])
    })
  })
})
