import { createError, defineEventHandler } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  // First, before any bypass: every request names its store once, and
  // everything keyed on the store reads it from here (`requestTenantHost`),
  // the bypassed sitemap and manifest routes and Nitro's cache keys
  // included.
  event.context.tenantHost = resolveTenantHost(event)

  // The bypass list is `server/utils/tenantBypass.ts`, the one every plugin
  // that would look the store up on its own consults as well.
  if (bypassesTenantMiddleware(event)) {
    return
  }

  // Skip tenant resolution during build-time prerendering — there is no
  // real host to resolve then.
  //
  // Gate on import.meta.prerender, NOT on the x-nitro-prerender header.
  // Nitro sets that header on its own localFetch while generating
  // routes, but a header is client-supplied: any visitor could send it
  // and have the middleware skip resolution entirely, leaving
  // event.context.tenant undefined. The page then rendered with no
  // tenant bound — a tenant's own domain serving platform content and
  // reading platform-schema data. Verified on staging: the same URL
  // returned the tenant's store normally and the platform's with the
  // header added.
  //
  // import.meta.prerender is replaced at build time and is false in
  // every deployed server, so it cannot be forged.
  if (import.meta.prerender) {
    return
  }

  const result = await requestTenantResult(event)

  if (result.type === 'error_5xx') {
    // Backend is temporarily unavailable — don't cache; respond 503 so the
    // client retries rather than getting a misleading 404.
    throw createError({ status: 503, statusText: 'Service Unavailable' })
  }

  if (!result.config) {
    throw createError({ status: 404, statusText: 'Store not found' })
  }

  event.context.tenant = result.config
  // The store on every wide event, so a slow page or a failing route can
  // be traced to its tenant. Set on the request logger, not in an
  // `evlog:enrich` hook: evlog prints the event when it is emitted and
  // enrichers run only after that, for drains, so enriched fields never
  // reach the stdout line Vector ships (evlog 2.29 `logger.ts`
  // emitWideEvent; its docs: "after they are emitted, before they reach
  // your drain adapters").
  event.context.log?.set({ tenantSchema: result.config.schemaName, tenantName: result.config.name })
})
