/**
 * Markdown for Agents — when the request advertises ``Accept: text/markdown``
 * on an HTML route, rewrite the URL to add the ``.md`` suffix BEFORE
 * ``nuxt-ai-ready``'s middleware runs. The module's default behaviour is
 * to issue a 307 redirect to the ``.md`` variant, which is correct per
 * spec but most agent-readiness scanners (and many CDNs caching by URL
 * alone, with no ``Vary: Accept``) don't follow the redirect — they see
 * 307 + ``text/html`` and report "no markdown negotiation".
 *
 * By rewriting the URL up-front, the same request lands on the markdown
 * handler directly and returns 200 + ``text/markdown`` in a single hop,
 * which is what those scanners (and Cloudflare's "Markdown for Agents"
 * feature) expect.
 */
const SKIP_PREFIXES = [
  '/_',
  '/api/',
  '/__',
  '/.well-known/',
  '/auth/',
  '/checkout/',
]

export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('request', (event) => {
    const accept = event.node.req.headers.accept || ''
    if (typeof accept !== 'string')
      return
    if (!accept.includes('text/markdown'))
      return

    const url = event.node.req.url || '/'
    const pathOnly = url.split('?')[0] || '/'

    if (pathOnly.includes('.'))
      return
    if (SKIP_PREFIXES.some(p => pathOnly.startsWith(p)))
      return

    const stripped = pathOnly.endsWith('/') && pathOnly.length > 1
      ? pathOnly.slice(0, -1)
      : pathOnly
    const newPath = stripped === '/' || stripped === '' ? '/index.md' : `${stripped}.md`
    const query = url.slice(pathOnly.length)
    const newUrl = `${newPath}${query}`

    // h3 derives ``event.path`` from ``event.node.req.url`` plus the
    // private ``event._path`` cache; both must be updated for downstream
    // middleware (Nuxt router, nuxt-ai-ready) to see the rewrite.
    ;(event as { _path?: string })._path = newUrl
    event.node.req.url = newUrl
  })
})
