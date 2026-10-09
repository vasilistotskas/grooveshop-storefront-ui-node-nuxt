/**
 * Markdown for Agents — when the request advertises ``Accept: text/markdown``
 * on an HTML route, intercept it BEFORE nuxt-ai-ready's middleware can
 * 307-redirect to the ``.md`` variant. Fetch the ``.md`` route internally
 * (so nuxt-ai-ready's "explicit .md" branch fires and returns markdown
 * directly), then send that response with ``text/markdown; charset=utf-8``.
 *
 * The default behaviour (a 307 to ``/<route>.md``) is correct per the spec
 * but most agent-readiness scanners and CDNs that key cache by URL alone
 * (no ``Vary: Accept``) don't follow the redirect — they see ``text/html``
 * + 307 and report "no markdown negotiation". This middleware delivers the
 * single-hop 200 + ``text/markdown`` outcome those scanners expect.
 *
 * The numeric prefix ``0.`` ensures we run before any module-registered
 * middleware (``markdown.ts`` from nuxt-ai-ready). We only intercept when
 * the client asks for markdown explicitly, so HTML browsers are unaffected.
 */
import { defineEventHandler, getRequestHeader, getRequestHost, serverFetch } from 'nuxt/server'

const SKIP_PREFIXES = [
  '/_',
  '/api/',
  '/__',
  '/.well-known/',
  '/auth/',
  '/checkout/',
]

export default defineEventHandler(async (event) => {
  const accept = getRequestHeader(event, 'accept') || ''
  if (!accept.includes('text/markdown'))
    return

  // Skip internal recursion (set on the in-process fetch below)
  if (getRequestHeader(event, 'x-md-negotiation-internal'))
    return

  const path = event.url.pathname
  if (path.includes('.'))
    return
  if (SKIP_PREFIXES.some(p => path.startsWith(p)))
    return

  const stripped = path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path
  const mdPath = stripped === '/' || stripped === '' ? '/index.md' : `${stripped}.md`

  // The original request's Host is pinned on the in-process fetch: the
  // downstream tenant/schema resolution depends on it, and `serverFetch`
  // forwards only the cookie and authorization headers on its own.
  const host = getRequestHost(event, { xForwardedHost: false })

  const upstream = await serverFetch(event, mdPath, {
    headers: {
      'x-md-negotiation-internal': '1',
      ...(host ? { host } : {}),
    },
  }).catch(() => null)

  if (!upstream || !upstream.ok)
    return

  const body = await upstream.text()
  if (!body)
    return

  event.res.headers.set('content-type', 'text/markdown; charset=utf-8')
  event.res.headers.set('vary', 'Accept')
  event.res.headers.set('cache-control', 'public, max-age=300, stale-while-revalidate=3600')
  return body
})
