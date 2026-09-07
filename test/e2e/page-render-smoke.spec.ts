import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import { execSync } from 'node:child_process'
import { createServer, request as httpRequest } from 'node:http'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { setup, url, useTestContext } from '@nuxt/test-utils/e2e'
import { validTenantConfig } from '../fixtures/tenantConfig'

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
 * LOOKS, only that rendering it does not throw.
 *
 * `.localhost` hosts and `node:http.request` for the same two reasons
 * as `tenant-swr-host-propagation.spec.ts`: Vite's dev server
 * unconditionally trusts `*.localhost`, and undici drops an explicit
 * `Host` override as a forbidden header.
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

function requestWithHost(
  path: string,
  host: string = TENANT_HOST,
  headers: Record<string, string> = {},
): Promise<{ statusCode: number, body: string, location?: string }> {
  return new Promise((resolve, reject) => {
    const target = new URL(url(path))
    const req = httpRequest(target, {
      headers: { Host: host, ...headers },
    }, (res) => {
      let body = ''
      res.on('data', (chunk: Buffer) => { body += chunk.toString() })
      res.on('end', () =>
        resolve({
          statusCode: res.statusCode ?? 0,
          body,
          location: res.headers.location,
        }),
      )
    })
    req.on('error', reject)
    req.end()
  })
}

describe('every public page renders', async () => {
  // Permissive by design: the point is to exercise the RENDER, so the
  // upstream answers whatever shape each route needs and nothing here
  // depends on the data. `page-config` 404s deliberately — that is the
  // documented "no published layout" state, so the pages fall back to
  // their code-level sections and the test does not need a layout
  // fixture to stay in step with the seeders.
  const fakeDjango: Server = createServer(
    (req: IncomingMessage, res: ServerResponse) => {
      const reqUrl = new URL(req.url ?? '/', 'http://internal')
      res.setHeader('Content-Type', 'application/json')

      if (reqUrl.pathname.endsWith('/tenant/resolve')) {
        const domain = reqUrl.searchParams.get('domain') ?? ''
        res.end(JSON.stringify(validTenantConfig(domain, {
          // The whole point of the /en assertions below.
          availableLocales: ['el', 'en'],
          blogEnabled: true,
          // ...and of the chrome-variant assertions at the end.
          schemaName: domain.startsWith('delta-sigma')
            ? VARIANT_SCHEMA
            : 'test',
        })))
        return
      }

      if (reqUrl.pathname.includes('/page-config/')) {
        res.statusCode = 404
        res.end(JSON.stringify({ detail: 'Not found.' }))
        return
      }

      if (reqUrl.pathname.endsWith('/settings/get')) {
        res.end(JSON.stringify({ value: 'false' }))
        return
      }

      res.end(JSON.stringify({ count: 0, results: [], links: {} }))
    },
  )

  await new Promise<void>((resolve, reject) => {
    fakeDjango.once('error', reject)
    fakeDjango.listen(0, resolve)
  })

  const address = fakeDjango.address()
  if (address === null || typeof address === 'string') {
    throw new Error('fake Django server did not bind to a TCP port')
  }
  const fakeDjangoPort = address.port

  await setup({
    rootDir: '.',
    dev: true,
    server: true,
    browser: false,
    setupTimeout: 240000,
    serverStartTimeout: 240000,
    env: {
      NUXT_API_BASE_URL: `http://127.0.0.1:${fakeDjangoPort}/api/v1`,
      NUXT_DJANGO_URL: `http://127.0.0.1:${fakeDjangoPort}`,
      NUXT_CACHE_BASE: 'memory',
      // server/plugins/startup-validation.ts hard-fails the boot without
      // these; nothing here exercises sessions or tokens.
      NUXT_SESSION_PASSWORD: 'e2e-test-session-password-32-chars-minimum-abcdef',
      NUXT_SECRET_KEY: 'e2e-test-secret-key',
    },
  })

  // Windows orphan guard, same contract as
  // `tenant-swr-host-propagation.spec.ts`: stopServer() SIGKILLs only
  // the shell shim, so the real `node nuxt.mjs _dev` grandchild keeps
  // @nuxt/cli's dev-server lock and the NEXT run dies with "Server
  // process exited before becoming ready". Hit exactly that while
  // writing this file. before-hooks run in definition order (so the
  // pid is readable by then) and after-hooks in reverse (so this runs
  // while the wrapper is still alive).
  let devServerPid: number | undefined
  beforeAll(() => {
    if (process.platform === 'win32') {
      devServerPid = useTestContext().serverProcess?.pid
    }
  })

  afterAll(() => {
    fakeDjango.close()
    if (devServerPid) {
      try {
        execSync(`taskkill /pid ${devServerPid} /T /F`, { stdio: 'ignore' })
      }
      catch {
        // Tree already gone — exactly what we want.
      }
    }
  })

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
  ]

  // Dev mode compiles routes on the FIRST request that touches them, so
  // a cold hit can transiently 500 before the pipeline is ready. Warm on
  // a throwaway path first and surface the last response if it never
  // becomes ready, so a real failure is not reported as a cold start.
  beforeAll(async () => {
    const deadline = Date.now() + 90000
    let last = { statusCode: 0, body: '' }
    while (Date.now() < deadline) {
      last = await requestWithHost('/robots.txt')
      if (last.statusCode === 200) return
      await new Promise(r => setTimeout(r, 500))
    }
    throw new Error(
      `dev server never became ready: ${last.statusCode} ${last.body.slice(0, 200)}`,
    )
  }, 120000)

  it.each(ROUTES)('renders %s', async (path, lang) => {
    const { statusCode, body } = await requestWithHost(path)

    expect(statusCode, `${path} did not answer 200: ${body.slice(0, 900)}`).toBe(200)
    // The lang attribute is the assertion that matters. A 200 alone
    // would pass on an error page; `lang` proves i18n resolved for the
    // route, which is exactly what the $i18n regression broke.
    expect(body, `${path} did not render lang="${lang}"`).toContain(
      `lang="${lang}"`,
    )
    expect(body).not.toContain('"statusCode":500')
  }, 60000)

  it('serves a tenant with a chrome variant its OWN navbar and footer', async () => {
    const { statusCode, body } = await requestWithHost('/', VARIANT_HOST)

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

  it('leaves a tenant without one on the platform chrome', async () => {
    const { statusCode, body } = await requestWithHost('/')

    expect(statusCode).toBe(200)
    expect(body).not.toContain('Consulting · Engineering')
  }, 60000)

  // `Accept-Language`, which nothing here sent before — and that is
  // exactly why this shipped. `detectBrowserLanguage` only redirects
  // when it DETECTS a locale, and with no header there is nothing to
  // detect, so every check answered 200 while a real Greek-preferring
  // browser was bounced off every /en URL:
  // `redirectOn: 'all'` sent `/en` → `/` and
  // `/en/products` → `/products`, so clicking EN went straight back to
  // EL and each /en URL was a redirect to a crawler.
  const GREEK_BROWSER = { 'Accept-Language': 'el-GR,el;q=0.9,en;q=0.8' }

  it.each([
    ['/en'],
    ['/en/products'],
    ['/en/blog'],
  ])('serves %s to a browser that prefers Greek', async (path) => {
    const { statusCode, body, location } = await requestWithHost(
      path,
      TENANT_HOST,
      GREEK_BROWSER,
    )

    expect(
      statusCode,
      `${path} redirected to ${location ?? '(no location)'}`,
    ).toBe(200)
    expect(body).toContain('lang="en-US"')
  }, 60000)

  it('still detects the browser language at the ROOT', async () => {
    // The other half of `redirectOn: 'root'`: detection has to keep
    // working where it belongs, or an English visitor lands on Greek.
    const { statusCode, location } = await requestWithHost(
      '/',
      TENANT_HOST,
      { 'Accept-Language': 'en-US,en;q=0.9' },
    )

    expect([200, 302]).toContain(statusCode)
    if (statusCode === 302) expect(location).toContain('/en')
  }, 60000)
})
