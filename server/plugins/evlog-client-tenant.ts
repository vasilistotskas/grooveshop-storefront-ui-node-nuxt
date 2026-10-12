import type { EnrichContext } from 'evlog'
import { defineNitroPlugin } from 'nitropack/runtime'

/**
 * Name the store a browser `log.*` event came from.
 *
 * `transport.enabled` makes the browser POST every client log to evlog's
 * `/api/_evlog/ingest`. That handler tags the event `source: 'client'`,
 * redacts it, applies `sampling.rates`, runs `evlog:enrich`, and only THEN
 * prints it — one `JSON.stringify` line, on the console method of the level,
 * which Vector ships to VictoriaLogs. So a field set here lands on that line.
 * (Server events are the opposite: evlog prints them at emit, before
 * `evlog:enrich`, which is why `0.tenant.ts` sets its fields on the request
 * logger instead.)
 *
 * The fields are the ones `0.tenant.ts` sets on server events,
 * `tenantSchema` / `tenantName`. The hook gets no h3 event, only evlog's
 * safe headers, and `host` survives that filter, so the store is resolved
 * from it by `getTenantConfig` — the cached resolver the tenant middleware
 * just used for this same request, so it is a cache hit, not a second Django
 * call. An unresolvable host leaves the fields off. The route is rate limited
 * by `server/middleware/2.evlog-ingest-rate-limit.ts`.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('evlog:enrich', async ({ event, headers }: EnrichContext) => {
    if (event.source !== 'client' || !headers?.host) return
    const { config } = await getTenantConfig(tenantHostOf(headers.host))
    if (!config) return
    event.tenantSchema = config.schemaName
    event.tenantName = config.name
  })
})
