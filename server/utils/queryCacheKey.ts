import { getQuery } from 'h3'
import type { H3Event } from 'h3'
import type { ZodObject } from 'zod'

/**
 * The part of a cached list route's key that comes from its query: every
 * parameter the route validates with `schema` (and so forwards to Django),
 * in the schema's own order, so the key does not depend on the order a
 * caller wrote them in. A parameter the route does not forward is no part of
 * it, and none that it forwards is left out: a list read at `page=2` is not
 * the list at `page=1`.
 *
 * Read off the schema, so a filter Django adds to the endpoint is keyed the
 * day the schema is regenerated. Use it as `tenantCacheKey(event, \`name:${queryCacheKey(event, schema)}\`)`.
 */
export function queryCacheKey(event: H3Event, schema: ZodObject): string {
  const query = getQuery(event)
  return Object.keys(schema.shape)
    .flatMap((name) => {
      const value = query[name]
      return value === undefined
        ? []
        : [`${name}=${[value].flat().map(item => encodeURIComponent(String(item))).join(',')}`]
    })
    .join('&')
}
