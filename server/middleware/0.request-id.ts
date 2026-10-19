import { defineEventHandler } from 'nuxt/server'

/**
 * The request's id, on every `/api` response, errors included: the id
 * evlog gives the request (`requestId`) and `useBackendFetch` forwards to
 * Django as `X-Correlation-ID`, so a failure the shopper reports can be
 * followed from the browser through this server into Django's logs.
 *
 * Only `/api`. A rendered page can be replayed from Nitro's page cache and
 * by Cloudflare's edge to many visitors, and an id that belongs to ONE
 * request must never travel with a shared response. Set on the outer
 * event, before the handler: a cached handler records the headers of its
 * own inner event, so a replay carries the id of the request it answers,
 * not of the one that filled the cache. It runs ahead of `0.tenant.ts`,
 * so the 404 and 503 that middleware answers carry it too.
 */
export default defineEventHandler((event) => {
  // evlog counts the bare `/api` as an API path too (its error handler answers it as one).
  const { pathname } = event.url
  if (pathname !== '/api' && !pathname.startsWith('/api/')) return

  const requestId = event.context.log?.getContext().requestId
  if (typeof requestId === 'string' && requestId) {
    event.res.headers.set(REQUEST_ID_HEADER, requestId)
  }
})
