/**
 * The sitemap's static routes come from a build-time manifest with no
 * tenant context, so a feature-gated page (whose route middleware hard
 * 404s when the feature is off) was advertised to every tenant. This
 * plugin removes those URLs per tenant at request time.
 *
 * Everything below the backend is real: the tenant lookup, the bulk
 * readers in `server/utils/tenantSetting.ts`, the shared truthiness rule
 * and the gated-route table. The backend answers from `store` below.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import plugin from '~~/server/plugins/sitemap-tenant-gate'
import { LEGAL_ROUTE_SLUGS } from '~~/shared/utils/legalPages'
import { validTenantConfig } from '~~/test/fixtures/tenantConfig'
import { backend, createTestEvent, jsonResponse, runNitroPlugin } from '~~/test/helpers/nitro'
import type { BackendRequest, TestNitroApp } from '~~/test/helpers/nitro'

type ContentPage = { slug: string, translations: Record<string, unknown> }

/** What the store's backend holds; `'down'` makes that endpoint fail. */
const store: {
  settings: Record<string, string> | 'down'
  content: ContentPage[] | 'down'
  layout: (pageType: string) => { isPublished: boolean } | 'absent'
} = { settings: {}, content: [], layout: () => ({ isPublished: true }) }

const BOTH_LOCALES = { el: {}, en: {} }
/** Default: the tenant has every legal document, in every locale, so tests vary one gate at a time. */
const ALL_LEGAL = () => Object.values(LEGAL_ROUTE_SLUGS).map(slug => ({ slug, translations: BOTH_LOCALES }))

function answer(request: BackendRequest) {
  const down = jsonResponse({ detail: 'upstream down' }, 404)
  if (request.path.endsWith('/settings/public')) return store.settings === 'down' ? down : { settings: store.settings }
  if (request.path.endsWith('/content-page')) return store.content === 'down' ? down : { results: store.content }
  const pageType = request.path.match(/\/page-config\/([^/?]+)$/)?.[1]
  if (pageType) {
    const layout = store.layout(pageType)
    // Django answers 404 for "no published layout".
    return layout === 'absent' ? jsonResponse({ detail: 'Not found.' }, 404) : layout
  }
  if (request.path.endsWith('/tenant/resolve')) return resolvedTenant ?? jsonResponse({ detail: 'Not found.' }, 404)
  throw new Error(`unexpected backend request: ${request.path}`)
}

/** The resolve payload for example.com; unset means no store owns it. */
let resolvedTenant: unknown
let nitroApp: TestNitroApp

const requestsTo = (suffix: string) => backend.requests.filter(r => r.path.includes(suffix))

/** A sitemap request on example.com, with the tenant 0.tenant would have bound (none when null). */
function eventFor(tenant: Record<string, unknown> | null, headers: Record<string, string> = {}) {
  return createTestEvent({ url: '/sitemap.xml', host: 'example.com', headers, context: tenant ? { tenant } : {} })
}

async function gate<T extends { urls: unknown[] }>(ctx: T): Promise<T> {
  await nitroApp.hooks.callHook('sitemap:resolved', ctx)
  return ctx
}

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
    event: eventFor(tenant),
  }
  await gate(ctx)
  return ctx.urls.map(u => u.loc)
}

describe('server/plugins/sitemap-tenant-gate', () => {
  beforeEach(async () => {
    // Every runtime setting off — the seeded default of the commercial
    // gates, and the webside.gr state Ahrefs reported.
    store.settings = {}
    store.content = ALL_LEGAL()
    store.layout = () => ({ isPublished: true })
    resolvedTenant = undefined
    backend.reply(answer)
    nitroApp = await runNitroPlugin(plugin)
  })

  it('drops a gated route when the tenant plan flag is off', async () => {
    // The plan gate decides on its own: a runtime setting that says ON
    // never overrides a plan that says OFF.
    store.settings = { LOYALTY_ENABLED: 'True' }

    const locs = await run({ ...OPEN, loyaltyEnabled: false })

    expect(locs).not.toContain('https://example.com/loyalty-program')
    // Ungated URLs are untouched.
    expect(locs).toContain('https://example.com/contact')
    expect(locs).toContain('https://example.com/')
  })

  it('reads the settings ONCE for every gate that needs one', async () => {
    await run(OPEN)

    expect(requestsTo('/settings/public')).toHaveLength(1)
  })

  it('drops the catalogue when the merchant setting is off', async () => {
    // One tier, not two: a store can hold a product model and serve no
    // shop, which is not a plan the platform sells or withholds.
    store.settings = { CATALOGUE_ENABLED: 'False' }

    const locs = await run(OPEN)

    expect(locs).not.toContain('https://example.com/products')
  })

  it('keeps the catalogue when the setting was never set', async () => {
    // `createSettingGate` fails OPEN: a store that never touched
    // CATALOGUE_ENABLED serves its catalogue, so the sitemap lists it.
    // The commercial gates (loyalty, offers, gift cards) fail closed on
    // the same absence — each route's own fallback, from the shared
    // table, not one policy for the feed.
    const locs = await run(OPEN)

    expect(locs).toContain('https://example.com/products')
    expect(locs).not.toContain('https://example.com/loyalty-program')
  })

  it('keeps the catalogue when the merchant setting is on', async () => {
    store.settings = { CATALOGUE_ENABLED: 'True' }

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
      event: eventFor(OPEN),
    }
    await gate(ctx)

    expect(ctx.urls.map(u => u.loc)).toEqual(['/blog', '/blog/categories'])
  })

  it('drops a gated route when the plan flag is on but the runtime setting is false', async () => {
    // Exactly the webside.gr state that put a 404 in the sitemap.
    store.settings = { LOYALTY_ENABLED: 'False' }

    const locs = await run(OPEN)

    expect(locs).not.toContain('https://example.com/loyalty-program')
  })

  it('keeps a gated route when both gates pass', async () => {
    store.settings = { LOYALTY_ENABLED: 'True' }

    const locs = await run(OPEN)

    expect(locs).toContain('https://example.com/loyalty-program')
  })

  it('accepts the shared truthiness rule, not only "True"', async () => {
    store.settings = { LOYALTY_ENABLED: '1' }

    const locs = await run(OPEN)

    expect(locs).toContain('https://example.com/loyalty-program')
  })

  it('allows the gated routes when the settings lookup errors, as the pages do', async () => {
    // Every route middleware RENDERS on a failed lookup: settingEnabled()
    // catches it and returns onError ?? fallback (true for
    // createSettingGate and for promotions), and loyalty-enabled.ts
    // returns without throwing. This feed used to fail closed here and
    // list fewer URLs than the store was serving. The rule lives in
    // shared/utils/gatedRoutes.ts so the two cannot drift apart again.
    store.settings = 'down'

    const locs = await run(OPEN)

    expect(locs).toContain('https://example.com/loyalty-program')
    expect(locs).toContain('https://example.com/products')
    expect(locs).toContain('https://example.com/offers')
  })

  it('drops the offers page when the promotions plan flag is off', async () => {
    store.settings = { PROMOTIONS_ENABLED: 'True' }

    const locs = await run({ ...OPEN, promotionsEnabled: false })

    expect(locs).not.toContain('https://example.com/offers')
  })

  it('drops the offers page when the plan flag is on but the runtime setting is false', async () => {
    // The webside.gr state Ahrefs reported on 2026-09-11.
    store.settings = { PROMOTIONS_ENABLED: 'False' }

    const locs = await run(OPEN)

    expect(locs).not.toContain('https://example.com/offers')
  })

  it('keeps the offers page when both promotion gates pass', async () => {
    store.settings = { PROMOTIONS_ENABLED: 'True' }

    const locs = await run(OPEN)

    expect(locs).toContain('https://example.com/offers')
  })

  it('resolves the tenant itself when the sitemap route bypassed tenant middleware', async () => {
    resolvedTenant = validTenantConfig('example.com', { ...OPEN, loyaltyEnabled: false })

    const locs = await run(null)

    expect(requestsTo('/tenant/resolve')[0]?.query).toEqual({ domain: 'example.com' })
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
      event: eventFor({ ...OPEN, loyaltyEnabled: false }),
    }
    await gate(ctx)

    expect(ctx.urls.map(u => u.loc)).toEqual(['/contact'])
  })

  it('leaves the sitemap untouched when the tenant cannot be resolved', async () => {
    const locs = await run(null)

    expect(locs).toEqual(ALL_URLS.map(u => u.loc))
  })

  it('drops the gift-card page when the plan does not include it', async () => {
    store.settings = { GIFT_CARDS_ENABLED: 'True' }
    const ctx = await gate({ urls: [{ loc: '/gift-cards' }, { loc: '/contact' }], event: eventFor({ ...OPEN, giftCardsEnabled: false }) })

    expect(ctx.urls.map(u => u.loc)).toEqual(['/contact'])
  })

  it('keeps the gift-card page when plan and setting both allow it', async () => {
    store.settings = { GIFT_CARDS_ENABLED: 'True' }
    const ctx = await gate({ urls: [{ loc: '/gift-cards' }], event: eventFor({ ...OPEN, giftCardsEnabled: true }) })

    expect(ctx.urls.map(u => u.loc)).toEqual(['/gift-cards'])
  })

  it('filters plain-string URL entries like object ones', async () => {
    const ctx = await gate({ urls: ['/loyalty-program', '/contact'], event: eventFor({ ...OPEN, loyaltyEnabled: false }) })

    expect(ctx.urls).toEqual(['/contact'])
  })

  it('leaves the list alone when the sitemap is built without a request', async () => {
    const ctx = await gate({ urls: [...ALL_URLS], event: undefined })

    expect(ctx.urls).toEqual(ALL_URLS)
    expect(backend.requests).toEqual([])
  })

  it('reads the store settings for the Host, never a forwarded one', async () => {
    await gate({ urls: [...ALL_URLS], event: eventFor(OPEN, { 'x-forwarded-host': 'evil.example' }) })

    const [settings] = requestsTo('/settings/public')
    expect(settings?.headers.get('x-forwarded-host')).toBe('example.com')
    expect(requestsTo('/content-page')[0]?.query).toEqual({ pageSize: '100' })
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
        event: eventFor({ ...OPEN, loyaltyEnabled: false, ...tenant }),
      }
      await gate(ctx)
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

    async function runLegal(tenant: Record<string, unknown>) {
      const ctx = {
        urls: [...URLS],
        sitemapName: 'sitemap',
        event: eventFor(tenant),
      }
      await gate(ctx)
      return ctx.urls.map(u => u.loc)
    }

    it('keeps every legal route a tenant has published', async () => {
      expect(await runLegal(OPEN)).toEqual(URLS.map(u => u.loc))
    })

    it('drops the returns policy a tenant has not published', async () => {
      // The live case. `return-policy` is seeded UNPUBLISHED because
      // only the merchant can write one, so three of the four
      // production tenants answer 404 there.
      store.content = [
          { slug: 'terms', translations: BOTH_LOCALES },
          { slug: 'privacy', translations: BOTH_LOCALES },
          { slug: 'cookies', translations: BOTH_LOCALES },
        ]

      const locs = await runLegal(OPEN)

      expect(locs).not.toContain('https://example.com/return-policy')
      expect(locs).toContain('https://example.com/terms-of-use')
    })

    it('drops every legal route for a tenant with none published', async () => {
      store.content = []

      expect(await runLegal(OPEN)).toEqual([])
    })

    it('fails CLOSED when the content lookup errors', async () => {
      // Same trade as the settings gate: a sitemap that fails open
      // publishes a URL its own gate then 404s.
      store.content = 'down'

      expect(await runLegal(OPEN)).toEqual([])
    })

    it('reads the content pages ONCE for every legal route', async () => {
      await runLegal(OPEN)

      expect(requestsTo('/content-page')).toHaveLength(1)
    })

    it('drops the locale a document is not translated into', async () => {
      // delta-sigma's live state: it serves `el` and `en`, its legal
      // documents exist only in Greek, and `extractTranslated` does not
      // fall back — so /en/terms-of-use 404s while /terms-of-use is
      // fine. Three such URLs were in its sitemap.
      store.content = Object.values(LEGAL_ROUTE_SLUGS)
        .map(slug => ({ slug, translations: { el: {} } }))

      const ctx = {
        urls: [
          { loc: 'https://example.com/terms-of-use' },
          { loc: 'https://example.com/en/terms-of-use' },
        ],
        sitemapName: 'sitemap',
        event: eventFor({ ...OPEN, availableLocales: ['el', 'en'] }),
      }
      await gate(ctx)

      expect(ctx.urls.map(u => u.loc))
        .toEqual(['https://example.com/terms-of-use'])
    })

    it('still drops it when nothing else is gated', async () => {
      // The early return short-circuits the whole filter when nothing
      // is blocked and every platform locale is served. A fully
      // configured bilingual store with ONE untranslated legal document
      // hits exactly that combination, so the return has to account for
      // locale-restricted routes or the 404 survives.
      store.settings = {
        LOYALTY_ENABLED: 'True',
        CATALOGUE_ENABLED: 'True',
        PROMOTIONS_ENABLED: 'True',
      }
      store.content = Object.values(LEGAL_ROUTE_SLUGS)
        .map(slug => ({ slug, translations: { el: {} } }))

      const ctx = {
        urls: [
          { loc: 'https://example.com/terms-of-use' },
          { loc: 'https://example.com/en/terms-of-use' },
        ],
        sitemapName: 'sitemap',
        event: eventFor({ ...OPEN, availableLocales: ['el', 'en'] }),
      }
      await gate(ctx)

      expect(ctx.urls.map(u => u.loc))
        .toEqual(['https://example.com/terms-of-use'])
    })

    it('drops the hreflang alternate for the untranslated locale', async () => {
      // Dropping /en/terms-of-use from the url set is not enough: the
      // surviving /terms-of-use still advertised an `en` alternate
      // pointing at it, so the 404 came back as an hreflang. The
      // locale gate cannot catch this — the tenant DOES serve `en`.
      store.content = Object.values(LEGAL_ROUTE_SLUGS)
          .map(slug => ({ slug, translations: { el: {} } }))

      const ctx = {
        urls: [{
          loc: 'https://example.com/terms-of-use',
          alternatives: [
            { hreflang: 'x-default', href: 'https://example.com/terms-of-use' },
            { hreflang: 'el', href: 'https://example.com/terms-of-use' },
            { hreflang: 'en', href: 'https://example.com/en/terms-of-use' },
          ],
        }],
        sitemapName: 'sitemap',
        event: eventFor({ ...OPEN, availableLocales: ['el', 'en'] }),
      }
      await gate(ctx)

      // Only one distinct href would remain, which is a page declaring
      // itself its own alternate — so the set goes entirely.
      expect(ctx.urls[0]!.alternatives).toBeUndefined()
    })

    it('keeps the alternates when the document exists in both', async () => {
      const ctx = {
        urls: [{
          loc: 'https://example.com/terms-of-use',
          alternatives: [
            { hreflang: 'el', href: 'https://example.com/terms-of-use' },
            { hreflang: 'en', href: 'https://example.com/en/terms-of-use' },
          ],
        }],
        sitemapName: 'sitemap',
        event: eventFor({ ...OPEN, availableLocales: ['el', 'en'] }),
      }
      await gate(ctx)

      expect(ctx.urls[0]!.alternatives.map((a: any) => a.hreflang))
        .toEqual(['el', 'en'])
    })

    it('keeps both locales when the document is translated', async () => {
      const ctx = {
        urls: [
          { loc: 'https://example.com/terms-of-use' },
          { loc: 'https://example.com/en/terms-of-use' },
        ],
        sitemapName: 'sitemap',
        event: eventFor({ ...OPEN, availableLocales: ['el', 'en'] }),
      }
      await gate(ctx)

      expect(ctx.urls).toHaveLength(2)
    })

    it('is independent of the layout gate', async () => {
      // A tenant can have its legal documents without any brand page.
      store.layout = () => 'absent'

      expect(await runLegal(OPEN)).toEqual(URLS.map(u => u.loc))
    })

    it('gates on the ContentPage slug, not on the route name', async () => {
      // `/terms-of-use` is backed by the slug `terms`. A tenant whose
      // only page is literally named `terms-of-use` does not have the
      // document this route renders.
      store.content = [{ slug: 'terms-of-use', translations: BOTH_LOCALES }]

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

    async function runLayout(tenant: Record<string, unknown>) {
      const ctx = {
        urls: [...URLS],
        sitemapName: 'sitemap',
        event: eventFor(tenant),
      }
      await gate(ctx)
      return ctx.urls.map(u => u.loc)
    }

    it('keeps the pages a tenant has published a layout for', async () => {
      expect(await runLayout(OPEN)).toEqual(URLS.map(u => u.loc))
    })

    it('drops every brand page for a tenant that has none', async () => {
      // Django answers 404 for "no published layout" — the state of
      // every tenant but webside.
      store.layout = () => 'absent'

      expect(await runLayout(OPEN)).toEqual([])
    })

    it('drops only the unpublished one', async () => {
      store.layout = pageType => pageType === 'about' ? { isPublished: true } : 'absent'

      expect(await runLayout(OPEN)).toEqual(['https://example.com/about'])
    })

    it('treats an unpublished layout as absent', async () => {
      // A 200 carrying isPublished:false is the draft state, and the
      // page 404s on it exactly like a missing row.
      store.layout = () => ({ isPublished: false })

      expect(await runLayout(OPEN)).toEqual([])
    })

    it('reads each pageType once, in one pass', async () => {
      await runLayout(OPEN)

      expect(requestsTo('/page-config/').map(r => r.path.split('/').pop()).sort()).toEqual(['about', 'vision', 'what-is-microlearning', 'why-microlearning'])
    })
  })
})
