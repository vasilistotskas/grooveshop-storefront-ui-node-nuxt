/**
 * TEST-ONLY diagnostic route — not part of the public API surface.
 *
 * `import.meta.dev` is replaced at build time (same trusted pattern as
 * `server/middleware/0.tenant.ts`'s `import.meta.prerender` guard), so this
 * always 404s in every built production image and can never be forged via a
 * client-supplied header.
 *
 * Exists solely so test/e2e/tenant-swr-host-propagation.spec.ts can drive a
 * REAL, live `defineCachedEventHandler({ swr: true })` route through Nitro's
 * stale-while-revalidate background revalidation. It uses the exact same
 * `X-Forwarded-Host` resolution (`createHeaders()` -> `useEvent()`) and the
 * exact same `tenantCacheKey()` scoping as the ~28 production cached routes
 * (e.g. `server/api/regions/index.get.ts`), but with `maxAge: 1` — the real
 * routes use `maxAge >= 300`, which is correct for production but far too
 * slow to exercise directly in a fast regression test.
 *
 * This pins the guarantee investigated for the "H3" audit finding: Nitro's
 * SWR background revalidation runs inside the SAME real H3Event /
 * AsyncLocalStorage context as the triggering request, so `useEvent()`
 * resolves the REAL per-tenant Host — never `config.public.djangoHostName`
 * — even after the response has already been sent to the client.
 */
export default defineCachedEventHandler(async () => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const config = useRuntimeConfig()
  const headers = createHeaders()

  return await $fetch(`${config.apiBaseUrl}/swr-tenant-probe`, {
    method: 'GET',
    headers,
  })
}, {
  name: 'SwrTenantProbe',
  maxAge: 1,
  staleMaxAge: 30,
  swr: true,
  getKey: event => tenantCacheKey(event, 'swr-tenant-probe'),
})
