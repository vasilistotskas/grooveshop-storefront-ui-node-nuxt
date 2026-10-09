/**
 * TEST-ONLY diagnostic route — not part of the public API surface.
 *
 * `import.meta.dev` is replaced at build time (same trusted pattern as
 * `server/middleware/0.tenant.ts`'s `import.meta.prerender` guard), so this
 * always 404s in every built production image and can never be forged via a
 * client-supplied header.
 *
 * Exists solely so test/e2e/swrHostPropagation.ts can drive a
 * REAL, live `defineCachedRoute({ swr: true })` route through Nitro's
 * stale-while-revalidate background revalidation. It uses the exact same
 * `X-Forwarded-Host` resolution (`createHeaders(event)`, the tenant host
 * the middleware put on the request's context) and the
 * exact same `tenantCacheKey()` scoping as the ~28 production cached routes
 * (e.g. `server/api/regions/index.get.ts`), but with `maxAge: 1` — the real
 * routes use `maxAge >= 300`, which is correct for production but far too
 * slow to exercise directly in a fast regression test.
 *
 * This pins the guarantee investigated for the "H3" audit finding: Nitro's
 * SWR background revalidation runs the handler with the triggering
 * request's event and context, so the revalidation names the REAL per-tenant
 * Host — never `config.public.djangoHostName` — even after the response has
 * already been sent to the client.
 */
import { z } from 'zod'
import { createError, useRuntimeConfig } from 'nuxt/server'

/** What the e2e harness's fake Django answers: the host it was sent, and how many times. */
const zProbeResponse = z.object({ host: z.string(), revision: z.int() })

export default defineCachedRoute(async (event) => {
  if (!import.meta.dev) {
    throw createError({ status: 404, statusText: 'Not Found' })
  }

  const config = useRuntimeConfig()
  const headers = createHeaders(event)

  // Typed and parsed like every proxy route; the explicit response type
  // also keeps TypeScript from matching the URL against every internal
  // route type, which ran past its stack depth.
  const response = await useBackendFetch(event)<unknown>(`${config.apiBaseUrl}/swr-tenant-probe`, {
    method: 'GET',
    headers,
  })
  return await parseDataAs(response, zProbeResponse)
}, {
  name: 'SwrTenantProbe',
  maxAge: 1,
  staleMaxAge: 30,
  swr: true,
  getKey: event => tenantCacheKey(event, 'swr-tenant-probe'),
})
