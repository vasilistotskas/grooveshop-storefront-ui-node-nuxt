import { isError } from 'h3'
import { defineNitroPlugin } from 'nitropack/runtime'

/**
 * Answers a request its client closed 499 "Client Closed Request" on EVERY
 * route, the status `rejectError` gives it in routes that return
 * `handleError`, so the response, the wide event's status and its level
 * agree wherever the request went.
 *
 * A route that reads the body of a request whose client closes mid-body
 * gets Node's `Error('aborted')` (`isClientAbort`). In a route that does not
 * map errors (`analytics/cookie-consent.post.ts`), h3 wraps the throw in a
 * 500 `H3Error` whose `cause` is that error, and Nitro's `onError` hands
 * that one object first to the `error` hooks (all called at once, before
 * the first awaits) and then to the error handler, which answers with its
 * status. evlog's own `error` hook reads the status there, synchronously,
 * for the wide event. So the status is set on that object, here, before
 * anyone reads it: evlog logs 499, `evlog-client-error-level.ts` then sees
 * a 4xx and logs it at warn, and Nuxt's error handler answers 499. Nobody
 * reads the answer (the client is gone); metrics, alerts and the access log
 * that count 5xx by status do.
 *
 * Registered through `nitro.plugins` in nuxt.config, NOT server/plugins/:
 * scanned plugins run after module plugins, so evlog's `error` hook would
 * already have read the 500.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', (error) => {
    if (!isError(error) || !isClientAbort(error)) return
    error.statusCode = CLIENT_CLOSED_REQUEST
    error.statusMessage = CLIENT_CLOSED_REQUEST_TEXT
  })
})
