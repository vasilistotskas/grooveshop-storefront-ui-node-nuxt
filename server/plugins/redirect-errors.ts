/**
 * A redirect that reaches Nitro as an error is answered as the redirect it is.
 *
 * nuxt-ai-ready renders a page's HTML to build its `.md` twin. When that page
 * redirects (a stale `[slug]`, for one), the module sets `Location` and then
 * RETURNS `createError({ statusCode: 301 })`, which h3 throws. Nitro treated
 * it as a failure: the error hook logged a server error, and the error
 * handler wrote `{"statusText":"Internal Server Error","error":true}` under
 * the 301 (the module passes the internal fetch's empty `statusText`).
 * The status and the `Location` header were right, the body and the log
 * were not, and the promote smoke check failed on them.
 *
 * The module also builds the page's URL without the request's query, so the
 * redirect it names has none: the request's query is carried over when the
 * redirect names no query of its own (`/x.md?page=2` is not sent to `/y.md`).
 *
 * `onError` is wrapped, not the error handler: it runs BEFORE Nitro captures
 * the error, so a redirect is neither logged nor handed to the error page.
 * Anything else, and a 3xx with no `Location`, takes the original path.
 */
import { getRequestURL, getResponseHeader, sendRedirect } from 'h3'
import { defineNitroPlugin } from 'nitropack/runtime'

const ABSOLUTE_URL = /^(?:[a-z][a-z\d+.-]*:|\/\/)/i

export default defineNitroPlugin((nitroApp) => {
  const { options } = nitroApp.h3App
  const handleError = options.onError

  options.onError = (error, event) => {
    const status = error.statusCode
    const location = getResponseHeader(event, 'location')
    if (status >= 300 && status < 400 && location) {
      const requested = getRequestURL(event)
      const target = new URL(String(location), requested)
      if (!target.search) target.search = requested.search
      const next = ABSOLUTE_URL.test(String(location)) ? target.href : `${target.pathname}${target.search}${target.hash}`
      return sendRedirect(event, next, status)
    }
    return handleError?.(error, event)
  }
})
