import type { DrainContext } from 'evlog'

/**
 * Put browser `log.*` events on stdout, where the cluster ships them.
 *
 * `transport.enabled` makes the browser POST every client log to evlog's
 * `/api/_evlog/ingest`. That handler tags the event `source: 'client'`,
 * runs `evlog:enrich`, and then ONLY calls `evlog:drain` â€” it never prints.
 * Server events are different: `emitWideEvent` prints them itself, one
 * `JSON.stringify` line per event, which Vector ships to VictoriaLogs. With
 * no drain registered, every client event was accepted (204) and dropped.
 *
 * This drain prints the client events the way evlog prints server events
 * (one JSON line, on the console method of the level), and ONLY those:
 * server events reach `evlog:drain` too, already printed, so printing them
 * again would log every request twice.
 *
 * evlog's `getConsoleMethod` is not exported from a public entrypoint, so
 * the three-way mapping is repeated here. In dev evlog pretty-prints server
 * events and the browser console already shows the client's own, so
 * nothing is printed. Client events bypass `emitWideEvent`, hence also
 * `sampling` and redaction: the client logs only deliberately, so every
 * level is kept. The route is rate limited by
 * `server/middleware/2.evlog-ingest-rate-limit.ts`.
 *
 * The store goes on the line as `tenantSchema` / `tenantName`, the fields
 * `0.tenant.ts` sets on server events. The drain gets no h3 event, only
 * evlog's safe headers, and `host` survives that filter, so the store is
 * resolved from it by `getTenantConfig` — the cached resolver the tenant
 * middleware just used for this same request, so it is a cache hit, not a
 * second Django call. An unresolvable host leaves the fields off.
 */
const CONSOLE_METHOD = { error: 'error', warn: 'warn' } as const

export default defineNitroPlugin((nitroApp) => {
  if (import.meta.dev) return

  nitroApp.hooks.hook('evlog:drain', async ({ event, headers }: DrainContext) => {
    if (event.source !== 'client') return
    const { config } = headers?.host ? await getTenantConfig(tenantHostOf(headers.host)) : { config: undefined }
    const line = config ? { ...event, tenantSchema: config.schemaName, tenantName: config.name } : event
    console[CONSOLE_METHOD[event.level as keyof typeof CONSOLE_METHOD] ?? 'log'](JSON.stringify(line))
  })
})
