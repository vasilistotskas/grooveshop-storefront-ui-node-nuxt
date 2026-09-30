import type { IncomingMessage, ServerResponse } from 'node:http'
import { describe, expect, it } from 'vitest'
import { requestWithHost, sendJson, waitUntilServing } from '../helpers/e2e'

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
 * The fake Django answers every probe with the `X-Forwarded-Host` it
 * received and a per-host revision number, and the probe route returns
 * that body as-is — so what a tenant is served says WHOSE host fetched
 * it. Once revalidated, tenant A's entry must be a newer revision of
 * A's own host. That catches a swapped host directly, whatever order
 * the two detached revalidations reach the upstream in (asserting the
 * arrival order only inferred a swap, and flaked on the order itself).
 *
 * Registered by test/e2e/storefront.spec.ts, on the dev server every
 * e2e suite shares.
 */

/**
 * Canary for `NUXT_PUBLIC_DJANGO_HOST_NAME`: correct operation never
 * sends it anywhere. If it shows up upstream, `createHeaders()` fell
 * back to the platform host instead of resolving the tenant's.
 */
export const PLATFORM_FALLBACK_HOST = 'platform-fallback.invalid.example'

const TENANT_A_HOST = 'tenant-a.localhost'
const TENANT_B_HOST = 'tenant-b.localhost'
const PROBE_PATH = '/api/_internal/swr-tenant-probe'

interface ProbeBody {
  host: string
  revision: number
}

/** `X-Forwarded-Host` of every probe fetch that reached the upstream, by arrival. */
const capturedHosts: string[] = []
const revisions = new Map<string, number>()

/** Answers the probe's upstream; `false` for any other request. */
export function swrProbeUpstream(req: IncomingMessage, res: ServerResponse, reqUrl: URL): boolean {
  if (!reqUrl.pathname.endsWith('/swr-tenant-probe')) return false

  const host = String(req.headers['x-forwarded-host'])
  capturedHosts.push(host)
  const revision = (revisions.get(host) ?? 0) + 1
  revisions.set(host, revision)
  // Small artificial delay mimics real upstream network latency, so the
  // SWR background continuation has real pending async work to survive
  // past the point where the triggering HTTP response was already sent.
  setTimeout(() => sendJson(res, { host, revision } satisfies ProbeBody), 30)
  return true
}

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

async function probe(host: string): Promise<ProbeBody> {
  const { statusCode, body } = await requestWithHost(PROBE_PATH, host)
  expect(statusCode, body.slice(0, 800)).toBe(200)
  return JSON.parse(body) as ProbeBody
}

export function describeSwrHostPropagation(): void {
  describe('SWR background revalidation forwards the real tenant host', () => {
    it('carries the triggering tenant Host on the SWR background revalidation fetch, never the platform fallback', async () => {
      // 0. Warm the probe route on a throwaway host, so the tenant-a/b
      //    cache entries stay pristine, then discard the warm-up's hits.
      await waitUntilServing(PROBE_PATH, 'warmup.localhost', 45000)
      capturedHosts.length = 0

      // 1. Prime the cache for both tenants. Each is a cache MISS, awaited
      //    inline by the request handler.
      expect(await probe(TENANT_A_HOST)).toEqual({ host: TENANT_A_HOST, revision: 1 })
      expect(await probe(TENANT_B_HOST)).toEqual({ host: TENANT_B_HOST, revision: 1 })

      // 2. Let the maxAge: 1 (second) entries go stale.
      await sleep(1300)

      // 3. Re-request both. Each is answered from the STALE entry at once
      //    (that is what `swr: true` means) while Nitro fires a detached
      //    background revalidation for it.
      expect(await probe(TENANT_A_HOST)).toEqual({ host: TENANT_A_HOST, revision: 1 })
      expect(await probe(TENANT_B_HOST)).toEqual({ host: TENANT_B_HOST, revision: 1 })

      // 4. Both revalidations reached the upstream — one per tenant, in
      //    whichever order — and neither fell back to the platform host.
      await expect.poll(() => capturedHosts.length, { timeout: 5000 }).toBeGreaterThanOrEqual(4)
      expect(capturedHosts.slice(2, 4).sort()).toEqual([TENANT_A_HOST, TENANT_B_HOST])
      expect(capturedHosts).not.toContain(PLATFORM_FALLBACK_HOST)

      // 5. Each tenant is now served what its OWN revalidation fetched: a
      //    newer revision, of its own host. Polled, because the entry is
      //    written only once the upstream answer lands.
      for (const host of [TENANT_A_HOST, TENANT_B_HOST]) {
        await expect.poll(async () => (await probe(host)).revision, { timeout: 5000 }).toBeGreaterThanOrEqual(2)
        expect((await probe(host)).host).toBe(host)
      }
    }, 120000)
  })
}
