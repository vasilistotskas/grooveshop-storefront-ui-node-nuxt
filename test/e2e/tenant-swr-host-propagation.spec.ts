import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import { createServer, request as httpRequest } from 'node:http'
import { afterAll, describe, expect, it } from 'vitest'
import { setup, url } from '@nuxt/test-utils/e2e'

/**
 * Regression test for the "H3" audit finding: during Nitro's `swr: true`
 * background revalidation (the re-fetch that fires AFTER the client
 * response has already been sent), does the outbound Django fetch carry
 * the CORRECT per-tenant `X-Forwarded-Host` (resolved via `useEvent()`),
 * or does it fall back to `config.public.djangoHostName`?
 *
 * Why a real e2e test, not a unit test with a mocked `useEvent()`: a mock
 * only proves the mock returns what it's told to return. The mechanism
 * under test is Nitro's own internal AsyncLocalStorage propagation
 * (`nitroAsyncContext` in `nitropack/dist/runtime/internal/context.mjs`)
 * across a fire-and-forget continuation that keeps running after the
 * triggering HTTP response has already been flushed to the client — that
 * can only be observed by driving a real `defineCachedEventHandler({ swr:
 * true })` route through a real Nitro server process with real
 * `useEvent()` calls and real network I/O, then inspecting what the
 * resulting outbound fetch actually carried.
 *
 * A prior investigation attempt (importing nitropack's internal
 * `context.mjs` directly via plain Node, bypassing Nitro's build step) was
 * a FALSE NEGATIVE: `import.meta._asyncContext` is a build-time constant
 * that Nitro's bundler inlines to `true` — importing the raw source
 * outside that pipeline silently leaves it `undefined`, disabling
 * AsyncLocalStorage and making `useEvent()` fail even when production
 * wouldn't. This test avoids that trap by running against
 * `@nuxt/test-utils/e2e`'s `setup({ dev: true })`, which boots the REAL
 * compiled Nitro dev server as a separate child process — the same
 * `nitro.experimental.asyncContext: true` config (nuxt.config.ts) applies
 * there exactly as it does in the production build.
 *
 * Route under test: `server/api/_internal/swr-tenant-probe.get.ts` — a
 * dev-only diagnostic route (404s outside `import.meta.dev`, i.e. dead
 * code in every production build) that mirrors the exact production
 * pattern (`createHeaders()` -> `useEvent()`, `tenantCacheKey()`) used by
 * the ~28 real cached routes, but with `maxAge: 1` so a full
 * stale-while-revalidate cycle can be observed within a fast test — the
 * real routes use `maxAge >= 300`, correct for production but far too
 * slow to exercise directly here.
 *
 * A fake "Django" HTTP server stands in for the upstream API. It answers
 * `GET .../tenant/resolve` (required because `server/middleware/
 * 0.tenant.ts` runs on every request) and records the `X-Forwarded-Host`
 * header of every `GET .../swr-tenant-probe` hit it receives, in the
 * order received.
 *
 * `Host` header note: Node's global `fetch()`/undici silently drop an
 * explicit `Host` header override (WHATWG's forbidden-header-name list) —
 * verified empirically before writing this test. `node:http.request` does
 * not have this restriction, so it's used here instead of
 * `@nuxt/test-utils/e2e`'s `$fetch`/`fetch` helpers.
 */

const PLATFORM_FALLBACK_HOST = 'platform-fallback.invalid.example'
// `.localhost` is RFC 6761 reserved and unconditionally trusted by Vite's
// dev-server Host header check (`hostname.endsWith('.localhost')` short
// circuits `isHostAllowedInternal` in vite/dist/node/chunks/node.js),
// regardless of `server.allowedHosts` config — which matters because
// `@nuxt/test-utils/e2e`'s `dev: true` mode spawns `nuxi _dev` as a raw CLI
// subprocess that reads `nuxt.config.ts` from disk + env vars only; the
// `nuxtConfig` option passed to `setup()` never reaches it, so there is no
// way to inject `vite.server.allowedHosts` for this mode. Using `.localhost`
// hostnames sidesteps the check entirely instead.
const TENANT_A_HOST = 'tenant-a.localhost'
const TENANT_B_HOST = 'tenant-b.localhost'
const PROBE_PATH = '/api/_internal/swr-tenant-probe'

function validTenantConfig(domain: string) {
  return {
    schemaName: 'test',
    name: domain,
    storeName: domain,
    storeDescription: '',
    logoLightUrl: '',
    logoDarkUrl: '',
    faviconUrl: '',
    primaryColor: '',
    neutralColor: '',
    accentHex: '#000000',
    successHex: '#000000',
    warningHex: '#000000',
    errorHex: '#000000',
    infoHex: '#000000',
    themePreset: '',
    themeMetadata: {},
    defaultLocale: 'el',
    defaultCurrency: 'EUR',
    primaryDomain: domain,
    apiDomain: domain,
    assetsDomain: domain,
    staticDomain: domain,
    loyaltyEnabled: false,
    blogEnabled: false,
    agentStripeDelegatedEnabled: false,
    stripePublishableKey: '',
    allowedCspSources: [],
    metaPixelId: '',
    tiktokPixelId: '',
    gaTrackingId: '',
    totpIssuer: '',
    socialsDiscord: '',
    socialsFacebook: '',
    socialsInstagram: '',
    socialsPinterest: '',
    socialsReddit: '',
    socialsTiktok: '',
    socialsTwitter: '',
    socialsYoutube: '',
    boxNowPartnerId: '',
  }
}

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

async function waitUntil(condition: () => boolean, timeoutMs: number) {
  const start = Date.now()
  while (!condition()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`waitUntil: condition not met within ${timeoutMs}ms`)
    }
    await sleep(50)
  }
}

function requestWithHost(path: string, host: string): Promise<{ statusCode: number, body: string }> {
  return new Promise((resolve, reject) => {
    const target = new URL(url(path))
    const req = httpRequest(target, { headers: { Host: host } }, (res) => {
      let body = ''
      res.on('data', (chunk: Buffer) => { body += chunk.toString() })
      res.on('end', () => resolve({ statusCode: res.statusCode ?? 0, body }))
    })
    req.on('error', reject)
    req.end()
  })
}

describe('SWR background revalidation forwards the real tenant host', async () => {
  const capturedHosts: string[] = []

  const fakeDjango: Server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const reqUrl = new URL(req.url ?? '/', 'http://internal')

    if (reqUrl.pathname.endsWith('/tenant/resolve')) {
      const domain = reqUrl.searchParams.get('domain') ?? ''
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(validTenantConfig(domain)))
      return
    }

    if (reqUrl.pathname.endsWith('/swr-tenant-probe')) {
      capturedHosts.push(String(req.headers['x-forwarded-host']))
      // Small artificial delay mimics real upstream network latency, so the
      // SWR background continuation has real pending async work to survive
      // past the point where the triggering HTTP response was already sent.
      setTimeout(() => {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ ok: true }))
      }, 30)
      return
    }

    res.statusCode = 404
    res.end()
  })

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
      // Canary value: correct operation never sends this anywhere. If it
      // ever shows up in `capturedHosts`, `createHeaders()` fell back to
      // the platform host instead of resolving the real per-tenant one.
      NUXT_PUBLIC_DJANGO_HOST_NAME: PLATFORM_FALLBACK_HOST,
      // Deterministic, isolated cache regardless of whether a local/CI
      // Redis happens to be reachable (server/plugins/storage.ts falls
      // back to memory anyway, but forcing it avoids cross-run pollution
      // through a shared Redis instance).
      NUXT_CACHE_BASE: 'memory',
    },
  })

  afterAll(() => {
    fakeDjango.close()
  })

  it('carries the triggering tenant Host on the SWR background revalidation fetch, never the platform fallback', async () => {
    // 0. Warm the dev server. In dev mode Nitro compiles routes + middleware
    //    on the FIRST request that touches them, and on a cold CI runner that
    //    first hit can transiently 500 before the pipeline is ready. Warm on a
    //    throwaway host so the tenant-a/b cache entries stay pristine, wait for
    //    a 200, then discard the warmup's recorded upstream hit(s). If it never
    //    becomes ready, surface the last status + body so a non-cold-start
    //    failure (e.g. a validation error) is visible in the logs.
    const warmDeadline = Date.now() + 45000
    let last = { statusCode: 0, body: '' }
    while (Date.now() < warmDeadline) {
      last = await requestWithHost(PROBE_PATH, 'warmup.localhost')
      if (last.statusCode === 200) {
        break
      }
      await sleep(500)
    }
    if (last.statusCode !== 200) {
      throw new Error(`probe route never became ready (last status ${last.statusCode}): ${last.body.slice(0, 800)}`)
    }
    capturedHosts.length = 0

    // 1. Prime the cache for both tenants. Each is a cache MISS, awaited
    //    inline by the request handler, so the fetch to fake Django happens
    //    synchronously within the request/response cycle.
    const primeA = await requestWithHost(PROBE_PATH, TENANT_A_HOST)
    const primeB = await requestWithHost(PROBE_PATH, TENANT_B_HOST)
    expect(primeA.statusCode).toBe(200)
    expect(primeB.statusCode).toBe(200)

    expect(capturedHosts).toEqual([TENANT_A_HOST, TENANT_B_HOST])

    // 2. Let the maxAge: 1 (second) entries go stale.
    await sleep(1300)

    // 3. Re-request both tenants. Both requests return the STALE cached
    //    value immediately (that's what `swr: true` means) while Nitro
    //    fires a fire-and-forget background revalidation for each — the
    //    two additional fake-Django hits captured below are those
    //    background revalidations, not the foreground responses.
    const staleA = await requestWithHost(PROBE_PATH, TENANT_A_HOST)
    const staleB = await requestWithHost(PROBE_PATH, TENANT_B_HOST)
    expect(staleA.statusCode).toBe(200)
    expect(staleB.statusCode).toBe(200)

    // 4. Give the detached background continuations time to actually reach
    //    fake Django — they are NOT awaited by the HTTP responses above.
    await waitUntil(() => capturedHosts.length >= 4, 5000)

    expect(capturedHosts).toHaveLength(4)
    // The two background-revalidation hits (indices 2 and 3) must carry
    // each tenant's OWN host — never swapped with the other tenant's, and
    // never the platform fallback (which is exactly what a broken
    // `useEvent()` during SWR revalidation would produce).
    expect(capturedHosts[2]).toBe(TENANT_A_HOST)
    expect(capturedHosts[3]).toBe(TENANT_B_HOST)
    expect(capturedHosts).not.toContain(PLATFORM_FALLBACK_HOST)
  })
})
