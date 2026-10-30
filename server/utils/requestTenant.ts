import { H3Event, getRequestHost } from 'h3'
import type { RequestEvent } from 'nuxt/server'

/**
 * The store a request is for, looked up ONCE per request: the first caller
 * starts the lookup and every other one (middleware, Nitro plugins,
 * routes) awaits the same promise from `event.context`, whatever the
 * outcome, a not-found and a 5xx included. A host that is not a store is
 * never cached across requests (see `server/utils/tenant.ts`), so without
 * this every caller of one request was its own Django round trip.
 *
 * Nothing carries over to the next request: `getTenantConfig`'s cache
 * rules are unchanged, and a store created a moment ago resolves on the
 * very next request.
 *
 * Callable before `0.tenant.ts` has run (a Nitro `request` hook), so it
 * names the host itself when the middleware has not.
 */
export function requestTenantResult(event: RequestEvent | H3Event): Promise<TenantResult> {
  // Nitro hands a plugin hook its h3 event, which `nuxt/server`'s helpers
  // type no further than its context.
  event.context.tenantHost ??= event instanceof H3Event
    ? tenantHostOf(getRequestHost(event))
    : resolveTenantHost(event)
  event.context.tenantResult ??= event.context.tenant
    ? Promise.resolve({ type: 'ok', config: event.context.tenant })
    : getTenantConfig(event.context.tenantHost)
  return event.context.tenantResult
}
