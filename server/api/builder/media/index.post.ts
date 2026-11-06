import { proxyRequest, setResponseHeader } from 'h3'
import type { H3Event } from 'h3'
import { defineEventHandler, useRuntimeConfig } from 'nuxt/server'

/**
 * Uploads an image into the library: the multipart body (`file`, optionally
 * `focalX`, `focalY`, and `alt` as a JSON object of language to text) streams
 * through to Django's `POST builder/media`, which answers the asset (the one
 * already there, with `duplicate: true`, when the same image is uploaded
 * again). Django's refusals (not an image, too large) reach the editor as
 * they are.
 *
 * It PROXIES instead of parsing, for the reason `contact/attachment.post.ts`
 * does (the body is never read into this process, and so is not checked
 * here; Django re-derives the size from the bytes it stores and holds the
 * store's own limit), and its reply is not parsed with a schema either,
 * since it is piped. The tenant headers are set by hand because
 * `sendProxy` needs a real `fetch`, which `useBackendFetch` is not.
 *
 * Staff only (`requireBuilderStaff`), never cached: the answer is marked
 * `private, no-store` after Django's headers are copied, so none can loosen it.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const { headers } = await requireBuilderStaff(event)
  // The portable event is the h3 one behind a view (`h3`'s helpers read what they need off it), which is what `proxyRequest` takes.
  return await proxyRequest(event as unknown as H3Event, `${config.apiBaseUrl}/builder/media`, {
    streamRequest: true,
    headers: {
      ...headers,
      // `SECURE_SSL_REDIRECT` would 301 an in-cluster request to the public HTTPS URL, and a 301 loses the body.
      'X-Forwarded-Proto': 'https',
      'X-Forwarded-Host': requestTenantHost(event),
      'X-Language': requestLocale(event),
    },
    onResponse: (proxied) => {
      setResponseHeader(proxied, 'Cache-Control', 'private, no-store')
    },
  })
})
