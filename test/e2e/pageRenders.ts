import type { IncomingMessage, ServerResponse } from 'node:http'
import { beforeAll, describe, expect, it } from 'vitest'
import { validTenantConfig } from '../fixtures/tenantConfig'
import { BROWSER_ACCEPT, requestWithHost, sendJson, waitUntilServing } from '../helpers/e2e'

/**
 * Does a PAGE still render?
 *
 * Nothing in CI answered that before this file. The unit and nuxt
 * projects mock `useFetch` and assert composables in isolation; the
 * only e2e spec drives one internal API route. Both were green for
 * storefront v3.170.1, which returned **500 on every page route for
 * every tenant** in production: `usePageConfig` and `useNavigation`
 * read the locale through `useNuxtApp().$i18n`, which is `undefined`
 * outside @nuxtjs/i18n's own setup plugin, so destructuring it threw
 * during SSR. Server routes and `/robots.txt` kept working, which is
 * why every existing test passed.
 *
 * So this asserts the one thing they could not: a real Nitro server,
 * a real SSR render, a 200 and HTML that proves the locale resolved.
 * It is a smoke test on purpose — it says nothing about how a page
 * LOOKS, only that rendering it does not throw — plus the statuses a
 * crawler sees, which only a real render produces: the SSR 404/503 a
 * page body throws, the login redirect, the unserved-locale 404.
 *
 * Registered by test/e2e/storefront.spec.ts, which boots the one dev
 * server every e2e suite shares; the harness (fake Django, dev server,
 * `Host`-preserving requests) is test/helpers/e2e.ts.
 */

const TENANT_HOST = 'render-smoke.localhost'

/**
 * A second host resolving to the `delta_sigma` schema, so the SAME
 * server can be asked whether the per-tenant chrome seam still fires.
 * The tenant's navbar and footer are lazy components looked up by
 * schema in `chromeRegistry`; if the key drifts or `schemaName` is not
 * populated during SSR, they silently never render and the tenant is
 * served the platform's chrome instead — a failure that looks like a
 * design regression, not an error, and that no other test would catch.
 */
const VARIANT_HOST = 'delta-sigma-smoke.localhost'
const VARIANT_SCHEMA = 'delta_sigma'
// Resolves to the `webside` schema, whose whole storefront is a frozen
// variant tree (app/components/variants/webside/).
const WEBSIDE_HOST = 'webside-smoke.localhost'
// A store that serves Greek only (`availableLocales: ['el']`), for the
// `locale-available` gate: every platform locale exists as a ROUTE on
// every store, so only that middleware keeps `/en/**` off this one.
const GREEK_ONLY_HOST = 'el-only-smoke.localhost'

// Content that fails upstream, for the 5xx → 503 mapping.
const OUTAGE_CONTENT_SLUG = 'outage'
const OUTAGE_LAYOUT_SLUG = 'outage-page'

function request(path: string, host = TENANT_HOST, headers: Record<string, string> = {}) {
  return requestWithHost(path, host, headers)
}

/**
 * `X-Forwarded-Host` of every allauth-config request, by arrival.
 * Every render that runs the session bootstrap (app/plugins/setup.ts)
 * loads the allauth config, and the proxy forwards the tenant host,
 * so a host absent here is a render that skipped the bootstrap.
 */
const configRequestHosts: string[] = []

/**
 * The fake Django for these pages. Permissive by design: the point is
 * to exercise the RENDER, so it answers whatever shape each route needs
 * and nothing here depends on the data. `page-config` 404s deliberately
 * — that is the documented "no published layout" state, so the pages
 * fall back to their code-level sections and the test does not need a
 * layout fixture to stay in step with the seeders.
 */
export function pageRenderUpstream(req: IncomingMessage, res: ServerResponse, reqUrl: URL): void {
  if (reqUrl.pathname.endsWith('/tenant/resolve')) {
    const domain = reqUrl.searchParams.get('domain') ?? ''
    sendJson(res, validTenantConfig(domain, {
      // The whole point of the /en assertions below.
      availableLocales: domain.startsWith('el-only') ? ['el'] : ['el', 'en'],
      blogEnabled: true,
      // ...and of the chrome-variant assertions at the end.
      schemaName: domain.startsWith('delta-sigma')
        ? VARIANT_SCHEMA
        : domain.startsWith('webside-smoke')
          ? 'webside'
          : 'test',
    }))
    return
  }

  if (reqUrl.pathname.endsWith('/_allauth/app/v1/config')) {
    configRequestHosts.push(String(req.headers['x-forwarded-host']))
  }

  if (reqUrl.pathname.endsWith(`/page-config/${OUTAGE_LAYOUT_SLUG}`)) {
    sendJson(res, { detail: 'Internal server error.' }, 500)
    return
  }

  if (reqUrl.pathname.includes('/page-config/')) {
    sendJson(res, { detail: 'Not found.' }, 404)
    return
  }

  if (reqUrl.pathname.endsWith(`/content-page/${OUTAGE_CONTENT_SLUG}`)) {
    sendJson(res, { detail: 'Internal server error.' }, 500)
    return
  }

  // The legal routes render the tenant's own ContentPage and 404
  // when there is none — an absent legal document is a real 404, not
  // a cue to render an empty page. Every tenant is seeded these at
  // provisioning, so the upstream always has one and the stub
  // mirrors that. The body is sectioned because the page derives its
  // table of contents from the document's own headings.
  if (reqUrl.pathname.includes('/content-page/')) {
    const slug = reqUrl.pathname.split('/').filter(Boolean).pop() ?? ''
    const translation = {
      title: 'Νομικό έγγραφο',
      body: '<section id="scope"><h2>Πεδίο εφαρμογής</h2><p>Κείμενο.</p></section>',
    }
    sendJson(res, {
      id: 1,
      uuid: '00000000-0000-4000-8000-000000000000',
      slug,
      // `privacy` exists in Greek only — the state of a store whose
      // merchant has not translated a document, and what the
      // fallback assertions below render through. Everything else
      // carries both, so the plain route table stays unaffected.
      translations: slug === 'privacy'
        ? { el: translation }
        : { el: translation, en: translation },
      isPublished: true,
      publishedAt: '2026-01-01T00:00:00Z',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    })
    return
  }

  if (reqUrl.pathname.endsWith('/settings/public')) {
    // No rows at all: every flag resolves to its caller's fallback.
    sendJson(res, { settings: {} })
    return
  }

  sendJson(res, { count: 0, results: [], links: {} })
}

export function describePageRenders(): void {
  describe('every public page renders', () => {
    beforeAll(async () => {
      await waitUntilServing('/robots.txt', TENANT_HOST, 90000)
    }, 120000)

    // `prefix_except_default`: Greek is unprefixed, English lives under
    // /en. Both halves are listed so a locale that renders only on one
    // side is a failure rather than a gap in the table.
    const ROUTES: ReadonlyArray<readonly [string, string]> = [
      ['/', 'el-GR'],
      ['/en', 'en-US'],
      ['/products', 'el-GR'],
      ['/en/products', 'en-US'],
      ['/blog', 'el-GR'],
      ['/en/blog', 'en-US'],
      ['/contact', 'el-GR'],
      ['/en/contact', 'en-US'],
      ['/privacy-policy', 'el-GR'],
      ['/en/privacy-policy', 'en-US'],
      // The fourth legal route. It rendered an empty stub while sitting in
      // LEGAL_ROUTE_SLUGS, so the /info/<slug> redirect pointed a
      // published document at a blank page in production.
      ['/return-policy', 'el-GR'],
      // A guest auth page and the cart: neither is section-driven, so they
      // prove the plain page-body seam (app/utils/variantRegistry.ts)
      // renders, not just the layouts that happen to have a fallback.
      ['/account/login', 'el-GR'],
      ['/en/account/login', 'en-US'],
      ['/cart', 'el-GR'],
    ]

    // Every page file is a shell that mounts its body through
    // `resolvePage`; the body is where `createError(404)` is thrown. A
    // status thrown one component down must still become the RESPONSE
    // status — a 200 error page is a soft-404 on every unpublished layout
    // and every unknown product.
    it.each([
      // No published `about` layout on the stub backend.
      ['/about'],
      // The catch-all [slug] route with no layout behind it.
      ['/no-such-page'],
      // Refused by the catch-all's `validate` (app/utils/customPageSlug.ts)
      // before any layout is asked for.
      ['/Our-Story'],
      ['/products/999999/unknown-product'],
    ])('answers 404 when the body of %s throws it', async (path) => {
      // A browser Accept: without it the error handler answers JSON on
      // purpose (API clients and crawlers of `.md` variants get data, not
      // a page), which is a separate contract from the one under test.
      const { statusCode, body } = await request(path, TENANT_HOST, BROWSER_ACCEPT)

      expect(statusCode, body.slice(0, 900)).toBe(404)
      // The error page is a real render in the visitor's locale, not a
      // bare Nitro JSON body.
      expect(body).toContain('lang="el-GR"')
    }, 60000)

    // An upstream outage is temporary: 503, so a crawler retries instead
    // of de-indexing the page, and error.vue's one-shot reload can heal it.
    it.each([
      [`/info/${OUTAGE_CONTENT_SLUG}`],
      [`/${OUTAGE_LAYOUT_SLUG}`],
    ])('answers 503 when the upstream fails behind %s', async (path) => {
      const { statusCode, body } = await request(path, TENANT_HOST, BROWSER_ACCEPT)

      expect(statusCode, body.slice(0, 900)).toBe(503)
    }, 60000)

    it.each([
      ['/account', '/account/login'],
      // The login page keeps the visitor's locale prefix.
      ['/en/account/orders', '/en/account/login'],
    ])('redirects a guest from %s to %s with the page as next', async (path, login) => {
      const { statusCode, location } = await request(`${path}?tab=2`, TENANT_HOST, BROWSER_ACCEPT)

      expect(statusCode).toBe(302)
      const target = new URL(location ?? '', 'http://storefront.invalid')
      expect(target.pathname).toBe(login)
      expect(target.searchParams.get('next')).toBe(`${path}?tab=2`)
    }, 60000)

    describe('on a store that serves one locale', () => {
      it.each([['/en'], ['/en/products']])('answers 404 for %s', async (path) => {
        const { statusCode, body } = await request(path, GREEK_ONLY_HOST, BROWSER_ACCEPT)

        expect(statusCode, body.slice(0, 900)).toBe(404)
      }, 60000)

      it('still serves its own locale', async () => {
        const { statusCode, body } = await request('/products', GREEK_ONLY_HOST)

        expect(statusCode, body.slice(0, 900)).toBe(200)
        expect(body).toContain('lang="el-GR"')
      }, 60000)
    })

    it.each(ROUTES)('renders %s', async (path, lang) => {
      const { statusCode, body } = await request(path)

      expect(statusCode, `${path} did not answer 200: ${body.slice(0, 900)}`).toBe(200)
      // The lang attribute is the assertion that matters. A 200 alone
      // would pass on an error page; `lang` proves i18n resolved for the
      // route, which is exactly what the $i18n regression broke.
      expect(body, `${path} did not render lang="${lang}"`).toContain(
        `lang="${lang}"`,
      )
      expect(body).not.toContain('"statusCode":500')
    }, 60000)

    // A page cached for everyone (Nitro swr route rules) is rendered ONCE
    // and replayed to every visitor, so its render must not bootstrap the
    // triggering visitor's session or cart (app/plugins/setup.ts returns
    // on `event.context.cache`; the 2026-08-28 SWR audit found the cart
    // baked into shared HTML). Each probe uses a host of its own, so the
    // config request its render made — or did not make — is attributable.
    it('renders a page cached for everyone without the visitor bootstrap', async () => {
      const cachedHost = 'cached-render-smoke.localhost'
      const freshHost = 'fresh-render-smoke.localhost'

      const cached = await request('/contact', cachedHost)
      const fresh = await request('/account/login', freshHost)

      expect(cached.statusCode, cached.body.slice(0, 900)).toBe(200)
      expect(fresh.statusCode, fresh.body.slice(0, 900)).toBe(200)
      // The control: an uncached render does bootstrap.
      expect(configRequestHosts).toContain(freshHost)
      expect(configRequestHosts).not.toContain(cachedHost)
    }, 60000)

    // The consent banner is a per-visitor decision, and the cached routes
    // are rendered once for everyone: a server render that included it
    // was served to visitors who had already answered, who then watched
    // it flash on every reload until hydration read their cookie.
    it('never renders the cookie banner on the server', async () => {
      const BANNER = 'Αυτός ο ιστότοπος χρησιμοποιεί Cookies'
      const anonymous = await request('/')
      expect(anonymous.statusCode, anonymous.body.slice(0, 900)).toBe(200)
      expect(anonymous.body).not.toContain(BANNER)

      const decided = await request('/', TENANT_HOST, {
        Cookie: 'ncc_c=necessary|functionality|ad|analytics|personalization|security; ncc_e=necessary',
      })
      expect(decided.statusCode, decided.body.slice(0, 900)).toBe(200)
      expect(decided.body).not.toContain(BANNER)
    })

    // A legal document the merchant wrote in one language is still the
    // store's document in every language it serves. Before this it was a
    // 404 on the other locale — "your terms do not exist", which is false
    // and left an English-speaking customer no route to them at all.
    it('renders an untranslated legal document in the language it exists in, and says so', async () => {
      // With a query on purpose: the canonical must name the document's
      // URL, never the tracking params a visitor arrived with.
      const { statusCode, body } = await request('/en/privacy-policy?utm_source=proof')

      expect(statusCode, body.slice(0, 900)).toBe(200)
      // The UI is English; the DOCUMENT is marked Greek.
      expect(body).toContain('lang="en-US"')
      expect(body).toMatch(/<article[^>]*\slang="el"/)
      expect(body).toContain('This document is available in Greek only.')
      // The fallback render is not a second copy: canonical names the
      // locale the document is in, and no alternate claims an English one.
      const canonical = body.match(/<link[^>]*rel="canonical"[^>]*>/)?.[0] ?? ''
      expect(canonical).toMatch(/href="[^"]*\/privacy-policy"/)
      expect(canonical).not.toContain('/en/privacy-policy')
      expect(canonical).not.toContain('utm_source')
      expect(body).not.toMatch(/hreflang="en"[^>]*privacy-policy/)
    }, 60000)

    it('renders a translated legal document in the requested language, unmarked', async () => {
      const { body } = await request('/en/terms-of-use')

      expect(body).not.toContain('This document is available in')
      expect(body).toMatch(/<article[^>]*\slang="en"/)
    }, 60000)

    it('serves a tenant with a chrome variant its OWN navbar and footer', async () => {
      const { statusCode, body } = await request('/', VARIANT_HOST)

      expect(statusCode, body.slice(0, 900)).toBe(200)
      // The lockup caption and the ΔΣ mark's own path are in the variant
      // components and nowhere in the platform chrome, so their presence
      // proves `resolveChromeComponent` matched and the layout rendered
      // what it returned.
      //
      // MARKUP, not styling: this asserted the brand hex until the
      // variants moved onto semantic tokens, at which point a correct
      // refactor failed a test that was pinning how the colour was
      // spelled rather than whether the component rendered.
      expect(body, 'the tenant navbar/footer lockup did not render')
        .toContain('Consulting · Engineering')
      expect(body, 'the ΔΣ mark did not render')
        .toContain('M11 3 L20 27 L2 27 Z')
    }, 60000)

    // webside keeps today's storefront as its own variant tree
    // (app/components/variants/webside/). Every route must still render
    // through it; what it renders is pinned by
    // test/nuxt/variants/webside/frozen-render.spec.ts.
    it.each([
      ['/', 'el-GR'],
      ['/products', 'el-GR'],
      ['/account/login', 'el-GR'],
      ['/privacy-policy', 'el-GR'],
    ])('renders %s for the webside variant host', async (path, lang) => {
      const { statusCode, body } = await request(path, WEBSIDE_HOST)

      expect(statusCode, `${path} on webside: ${body.slice(0, 900)}`).toBe(200)
      expect(body).toContain(`lang="${lang}"`)
      expect(body).not.toContain('"statusCode":500')
    }, 60000)

    it('leaves a tenant without one on the platform chrome', async () => {
      const { statusCode, body } = await request('/')

      expect(statusCode).toBe(200)
      expect(body).not.toContain('Consulting · Engineering')
    }, 60000)

    // `Accept-Language`, which nothing here sent before — and that is
    // exactly why this shipped. While `detectBrowserLanguage` was on it
    // only ever acted when it DETECTED a locale, and with no header there
    // is nothing to detect, so every check answered 200 while a real
    // browser was being redirected. Detection is off now
    // (`detectBrowserLanguage: false`), but the header stays here: it is
    // the one input that told the two apart.
    const GREEK_BROWSER = { 'Accept-Language': 'el-GR,el;q=0.9,en;q=0.8' }

    it.each([
      ['/en'],
      ['/en/products'],
      ['/en/blog'],
    ])('serves %s to a browser that prefers Greek', async (path) => {
      const { statusCode, body, location } = await request(path, TENANT_HOST, GREEK_BROWSER)

      expect(
        statusCode,
        `${path} redirected to ${location ?? '(no location)'}`,
      ).toBe(200)
      expect(body).toContain('lang="en-US"')
    }, 60000)

    it('serves the ROOT in the tenant default, whatever the browser asks', async () => {
      // No auto-redirect, for anybody. It could only ever run in the
      // browser — `/` is SWR-cached, so a cache hit never reaches the
      // Nuxt app — and there it fired mid-hydration, patching an English
      // tree over Greek markup until Vue died in `insertBefore` and the
      // visitor got an error page. The language switcher is the way
      // across, and every `/<locale>/**` URL stays directly reachable.
      const { statusCode, location, body } = await request('/', TENANT_HOST, { 'Accept-Language': 'en-US,en;q=0.9' })

      expect(
        statusCode,
        `/ redirected to ${location ?? '(no location)'}`,
      ).toBe(200)
      expect(body).toContain('lang="el-GR"')
    }, 60000)
  })
}
