import type { EnrichContext } from 'evlog'
import { defineNitroPlugin } from 'nitropack/runtime'

/**
 * Name the store and the browser a browser `log.*` event came from, and
 * strip the response body a failed call carries down to field names and codes.
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
 * The fields are the ones server events carry: `tenantSchema` / `tenantName`
 * as `0.tenant.ts` sets them, and `client` (browser and major version, OS
 * name, bot, country) as `2.evlog-client.ts` does, from the same
 * `clientFacts`. Without the browser, a browser-only failure could not be
 * told from ours: Safari before 16.4 has no import maps, so a lazy chunk
 * cannot resolve Nuxt's `#entry`, and 25 of the 26 "$routeBaseName is not
 * a function" reports in the week to 2026-10-16 came in the same page load
 * as one of those failures — which took a log correlation to see.
 *
 * The hook gets no h3 event, only evlog's safe headers; `host`,
 * `user-agent` and `cf-ipcountry` survive that filter. The store is resolved
 * by `getTenantConfig` — the cached resolver the tenant middleware just used
 * for this same request, so it is a cache hit, not a second Django call. An
 * unresolvable host leaves the store fields off. The route is rate limited
 * by `server/middleware/2.evlog-ingest-rate-limit.ts`.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('evlog:enrich', async ({ event, headers }: EnrichContext) => {
    if (event.source !== 'client') return
    // The one place every browser event passes: no customer input from a
    // failed response's body reaches the logs (`redactClientEventError`).
    redactClientEventError(event)
    const userAgent = headers?.['user-agent']
    if (userAgent) event.client = clientFacts(userAgent, headers?.['cf-ipcountry'])
    if (!headers?.host) return
    const { config } = await getTenantConfig(tenantHostOf(headers.host))
    if (!config) return
    event.tenantSchema = config.schemaName
    event.tenantName = config.name
  })
})
