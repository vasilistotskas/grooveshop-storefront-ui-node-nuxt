/**
 * Unit tests for server/plugins/sitemap-tenant-gate.ts
 *
 * The sitemap's static routes come from a build-time manifest with no
 * tenant context, so a feature-gated page (whose route middleware hard
 * 404s when the feature is off) was advertised to every tenant. This
 * plugin removes those URLs per tenant at request time.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  pageTypePublishedForHost,
  publicSettingsForHost,
  publishedContentSlugsForHost,
} from '../../../../server/utils/tenantSetting'
import { parseSettingFlag } from '../../../../shared/utils/settingFlag'
import { LEGAL_ROUTE_SLUGS } from '../../../../shared/utils/legalPages'

vi.stubGlobal('useRuntimeConfig', () => ({
  apiBaseUrl: 'https://api.example.com/api/v1',
}))

vi.stubGlobal('getRequestHost', () => 'example.com')

const getTenantConfigMock = vi.fn()
vi.stubGlobal('getTenantConfig', getTenantConfigMock)

// The bulk reads the plugin makes: the store's public settings, and the
// slugs of its published ContentPages (which say whether a legal route
// resolves for this tenant at all).
const settingsMock = vi.fn(async () => ({ settings: {} as Record<string, string> }))
const contentMock = vi.fn(async () => ({
  // Default: the tenant has every legal document, so these tests vary
  // one gate at a time like the settings ones do.
  results: Object.values(LEGAL_ROUTE_SLUGS).map(slug => ({ slug })),
}))
// One read per gated pageType: Django 404s when no layout is published.
const layoutMock = vi.fn(async (_pageType: string) => ({ isPublished: true }))
vi.stubGlobal('$fetch', (url: string) => {
  if (url.endsWith('/settings/public')) return settingsMock()
  if (url.endsWith('/content-page')) return contentMock()
  const m = url.match(/\/page-config\/([^/?]+)$/)
  if (m) return layoutMock(m[1]!)
  throw new Error(`unexpected $fetch: ${url}`)
})

// `publicSettingsForHost` and `parseSettingFlag` are auto-imports in
// the plugin. The real ones are stubbed in (rather than fakes) so these
// tests still exercise the shared truthiness rule and the fail-CLOSED
// branch.
vi.stubGlobal('publicSettingsForHost', publicSettingsForHost)
vi.stubGlobal('publishedContentSlugsForHost', publishedContentSlugsForHost)
vi.stubGlobal('pageTypePublishedForHost', pageTypePublishedForHost)
vi.stubGlobal('parseSettingFlag', parseSettingFlag)
// Read at MODULE scope by the plugin (the GATED_ROUTES literal derives
// the legal entries from it), so this must be stubbed before the import
// below rather than inside a test.
vi.stubGlobal('LEGAL_ROUTE_SLUGS', LEGAL_ROUTE_SLUGS)

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
  { loc: 'https://example.com/offers' },
  { loc: 'https://example.com/contact' },
]

/** A tenant with every gated surface ON, to vary one at a time. */
const OPEN = { loyaltyEnabled: true, blogEnabled: true, promotionsEnabled: true }

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
    // Every runtime setting off — the seeded default of the commercial
    // gates, and the webside.gr state Ahrefs reported.
    settingsMock.mockResolvedValue({ settings: {} })
  })

  it('registers the sitemap:resolved hook', () => {
    expect(resolvedHook).toBeTypeOf('function')
  })

  it('drops a gated route when the tenant plan flag is off', async () => {
    // The plan gate decides on its own: a runtime setting that says ON
    // never overrides a plan that says OFF.
    settingsMock.mockResolvedValue({ settings: { LOYALTY_ENABLED: 'True' } })

    const locs = await run({ ...OPEN, loyaltyEnabled: false })

    expect(locs).not.toContain('https://example.com/loyalty-program')
    // Ungated URLs are untouched.
    expect(locs).toContain('https://example.com/contact')
    expect(locs).toContain('https://example.com/')
  })

  it('reads the settings ONCE for every gate that needs one', async () => {
    await run(OPEN)

    expect(settingsMock).toHaveBeenCalledTimes(1)
  })

  it('drops the catalogue when the merchant setting is off', async () => {
    // One tier, not two: a store can hold a product model and serve no
    // shop, which is not a plan the platform sells or withholds.
    const locs = await run(OPEN)

    expect(locs).not.toContain('https://example.com/products')
  })

  it('keeps the catalogue when the merchant setting is on', async () => {
    settingsMock.mockResolvedValue({ settings: { CATALOGUE_ENABLED: 'True' } })

    const locs = await run(OPEN)

    expect(locs).toContain('https://example.com/products')
  })

  it('drops the blog index on the plan flag alone', async () => {
    // No extra_settings counterpart exists for the blog: the flag is
    // the sole gate, and `middleware/blog-enabled.ts` reads it too.
    const locs = await run({ ...OPEN, blogEnabled: false })

    expect(locs).not.toContain('https://example.com/blog')
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
    settingsMock.mockResolvedValue({ settings: { LOYALTY_ENABLED: 'False' } })

    const locs = await run(OPEN)

    expect(locs).not.toContain('https://example.com/loyalty-program')
  })

  it('keeps a gated route when both gates pass', async () => {
    settingsMock.mockResolvedValue({ settings: { LOYALTY_ENABLED: 'True' } })

    const locs = await run(OPEN)

    expect(locs).toContain('https://example.com/loyalty-program')
  })

  it('accepts the shared truthiness rule, not only "True"', async () => {
    settingsMock.mockResolvedValue({ settings: { LOYALTY_ENABLED: '1' } })

    const locs = await run(OPEN)

    expect(locs).toContain('https://example.com/loyalty-program')
  })

  it('fails closed when the settings lookup errors', async () => {
    settingsMock.mockRejectedValue(new Error('backend down'))

    const locs = await run(OPEN)

    expect(locs).not.toContain('https://example.com/loyalty-program')
    expect(locs).not.toContain('https://example.com/products')
    expect(locs).not.toContain('https://example.com/offers')
    // The plan-only and ungated URLs are unaffected by the read.
    expect(locs).toContain('https://example.com/blog')
    expect(locs).toContain('https://example.com/contact')
  })

  it('drops the offers page when the promotions plan flag is off', async () => {
    settingsMock.mockResolvedValue({ settings: { PROMOTIONS_ENABLED: 'True' } })

    const locs = await run({ ...OPEN, promotionsEnabled: false })

    expect(locs).not.toContain('https://example.com/offers')
  })

  it('drops the offers page when the plan flag is on but the runtime setting is false', async () => {
    // The webside.gr state Ahrefs reported on 2026-09-11.
    settingsMock.mockResolvedValue({ settings: { PROMOTIONS_ENABLED: 'False' } })

    const locs = await run(OPEN)

    expect(locs).not.toContain('https://example.com/offers')
  })

  it('keeps the offers page when both promotion gates pass', async () => {
    settingsMock.mockResolvedValue({ settings: { PROMOTIONS_ENABLED: 'True' } })

    const locs = await run(OPEN)

    expect(locs).toContain('https://example.com/offers')
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

  describe('legal document gate', () => {
    // The legal routes exist in the build-time route manifest for every
    // tenant, but each renders that tenant's ContentPage and throws a
    // 404 when there is none — so which of them belong in a sitemap is
    // per-tenant data that only the API can answer.
    const URLS = Object.keys(LEGAL_ROUTE_SLUGS)
      .map(route => ({ loc: `https://example.com/${route}` }))

    beforeEach(() => {
      contentMock.mockResolvedValue({
        results: Object.values(LEGAL_ROUTE_SLUGS).map(slug => ({ slug })),
      })
    })

    async function runLegal(tenant: Record<string, unknown>) {
      const ctx = {
        urls: [...URLS],
        sitemapName: 'sitemap',
        event: { context: { tenant } },
      }
      await resolvedHook!(ctx)
      return ctx.urls.map(u => u.loc)
    }

    it('keeps every legal route a tenant has published', async () => {
      expect(await runLegal(OPEN)).toEqual(URLS.map(u => u.loc))
    })

    it('drops the returns policy a tenant has not published', async () => {
      // The live case. `return-policy` is seeded UNPUBLISHED because
      // only the merchant can write one, so three of the four
      // production tenants answer 404 there.
      contentMock.mockResolvedValue({
        results: [{ slug: 'terms' }, { slug: 'privacy' }, { slug: 'cookies' }],
      })

      const locs = await runLegal(OPEN)

      expect(locs).not.toContain('https://example.com/return-policy')
      expect(locs).toContain('https://example.com/terms-of-use')
    })

    it('drops every legal route for a tenant with none published', async () => {
      contentMock.mockResolvedValue({ results: [] })

      expect(await runLegal(OPEN)).toEqual([])
    })

    it('fails CLOSED when the content lookup errors', async () => {
      // Same trade as the settings gate: a sitemap that fails open
      // publishes a URL its own gate then 404s.
      contentMock.mockRejectedValue(new Error('upstream down'))

      expect(await runLegal(OPEN)).toEqual([])
    })

    it('reads the content pages ONCE for every legal route', async () => {
      await runLegal(OPEN)

      expect(contentMock).toHaveBeenCalledTimes(1)
    })

    it('is independent of the layout gate', async () => {
      // A tenant can have its legal documents without any brand page.
      layoutMock.mockRejectedValue(new Error('404'))

      expect(await runLegal(OPEN)).toEqual(URLS.map(u => u.loc))
    })

    it('gates on the ContentPage slug, not on the route name', async () => {
      // `/terms-of-use` is backed by the slug `terms`. A tenant whose
      // only page is literally named `terms-of-use` does not have the
      // document this route renders.
      contentMock.mockResolvedValue({ results: [{ slug: 'terms-of-use' }] })

      expect(await runLegal(OPEN))
        .not.toContain('https://example.com/terms-of-use')
    })
  })

  describe('layout-driven page gate', () => {
    // `/about`, `/vision`, `/what-is-microlearning` and
    // `/why-microlearning` call usePageConfig and throw a hard 404 when
    // the tenant has published no layout. Only webside has any of them,
    // so demo and fyteia were advertising three 404s each and
    // delta-sigma four (times two, for the locale it serves).
    const LAYOUT_PATHS = [
      '/about',
      '/vision',
      '/what-is-microlearning',
      '/why-microlearning',
    ]
    const URLS = LAYOUT_PATHS.map(p => ({ loc: `https://example.com${p}` }))

    beforeEach(() => {
      layoutMock.mockResolvedValue({ isPublished: true })
    })

    async function runLayout(tenant: Record<string, unknown>) {
      const ctx = {
        urls: [...URLS],
        sitemapName: 'sitemap',
        event: { context: { tenant } },
      }
      await resolvedHook!(ctx)
      return ctx.urls.map(u => u.loc)
    }

    it('keeps the pages a tenant has published a layout for', async () => {
      expect(await runLayout(OPEN)).toEqual(URLS.map(u => u.loc))
    })

    it('drops every brand page for a tenant that has none', async () => {
      // Django answers 404 for "no published layout" — the state of
      // every tenant but webside.
      layoutMock.mockRejectedValue(new Error('404 Not Found'))

      expect(await runLayout(OPEN)).toEqual([])
    })

    it('drops only the unpublished one', async () => {
      layoutMock.mockImplementation(async (pageType: string) =>
        pageType === 'about'
          ? { isPublished: true }
          : Promise.reject(new Error('404 Not Found')),
      )

      expect(await runLayout(OPEN)).toEqual(['https://example.com/about'])
    })

    it('treats an unpublished layout as absent', async () => {
      // A 200 carrying isPublished:false is the draft state, and the
      // page 404s on it exactly like a missing row.
      layoutMock.mockResolvedValue({ isPublished: false })

      expect(await runLayout(OPEN)).toEqual([])
    })

    it('reads each pageType once, in one pass', async () => {
      await runLayout(OPEN)

      expect(layoutMock).toHaveBeenCalledTimes(LAYOUT_PATHS.length)
    })
  })
})
