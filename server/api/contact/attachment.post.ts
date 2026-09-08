import { DEFAULT_LOCALE } from '~~/i18n/locales'

/**
 * Stream one contact-form attachment through to Django.
 *
 * The only route in this server that PROXIES instead of parsing,
 * forwarding and re-validating, and the reason is the payload: every
 * sibling route reads a small JSON body, hands it to `$fetch` and
 * parses the reply with Zod. Doing that here would pull the whole
 * file into this process's heap first — a handful of concurrent
 * uploads is then tens of megabytes of Nitro RSS for bytes it does
 * not even look at. `proxyRequest` with `streamRequest: true` passes
 * the request's own stream to undici (`duplex: 'half'`), so the file
 * flows through without ever being buffered.
 *
 * Consequences of that choice, stated rather than left to be found:
 *
 * * The body is NOT read here, deliberately. `readRawBody`/
 *   `readMultipartFormData` would consume the stream and defeat the
 *   whole point; h3's own `proxyRequest` only streams while nobody
 *   has touched the body.
 * * The reply is NOT parsed with Zod, because `sendProxy` pipes
 *   Django's response body straight to the client. Django's 400s and
 *   its 404-when-disabled therefore reach the browser verbatim, which
 *   is what `forwardUpstreamClientError` achieves for the other
 *   routes by hand.
 * * The tenant headers are set explicitly. `useBackendFetch` cannot
 *   be used — `sendProxy` needs a real `fetch`, not an ofetch
 *   instance — and the global `$fetch` patch does not cover
 *   `globalThis.fetch`, so without these three Django would resolve
 *   the PUBLIC schema and file the upload in the wrong store (the N1
 *   pattern in MULTI_TENANT_AUDIT.md).
 *
 * The size check here bounds THIS hop, nothing more. It reads the
 * declared `Content-Length` — a claim, not a fact — and refuses
 * before opening a stream we know we do not want. Django re-derives
 * the true size from the bytes it actually writes and applies the
 * store's own (equal or tighter) limit, so a lying header buys
 * nothing; this only stops an obviously-too-large upload from
 * crossing the cluster first.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  const declared = Number(getRequestHeader(event, 'content-length') ?? 0)
  const ceiling = Number(config.contactAttachmentMaxBytes)
  if (declared > ceiling) {
    throw createError({
      statusCode: 413,
      statusMessage: 'Payload Too Large',
    })
  }

  return await proxyRequest(
    event,
    `${config.apiBaseUrl}/contact/attachment`,
    {
      streamRequest: true,
      headers: {
        // `SECURE_SSL_REDIRECT` would 301 an in-cluster request to the
        // public HTTPS URL, and a 301 loses the body.
        'X-Forwarded-Proto': 'https',
        'X-Forwarded-Host': getRequestHost(event, { xForwardedHost: false }),
        'X-Language': (event.context.locale as string) || DEFAULT_LOCALE,
      },
    },
  )
})
