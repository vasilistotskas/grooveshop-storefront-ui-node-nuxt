/**
 * An error response is never something to index.
 *
 * @nuxtjs/robots decides ``X-Robots-Tag`` by PATH: its server
 * middleware sets the header from the route rule before anything
 * renders, and its robots meta rides the normal page render. An error
 * page for an indexable path therefore shipped ``index, follow`` with
 * its 404/5xx and no robots meta at all (Ahrefs follow-up,
 * 2026-09-11).
 *
 * Nuxt renders the error page as an INTERNAL request to
 * ``/__nuxt_error`` (marked ``x-nuxt-error``), then copies every header
 * of that response onto the outer one with ``setResponseHeader``
 * (packages/nitro-server/src/runtime/handlers/error.ts) — so the
 * internal render is the one place a header reliably reaches the
 * client. Nitro's ``error`` hook is not: it runs in parallel with the
 * error handler (``callHookParallel``), and ``useRobotsRule(false)`` in
 * error.vue only touches the internal event's context, which the
 * module never reads back into a header (it skips ``/__`` paths).
 *
 * The value is the module's own ``robotsDisabledValue``, never a
 * string of our own, so the header and the module's configuration
 * cannot drift.
 */
import type { H3Event } from 'h3'

export function isNuxtErrorRender(event: H3Event): boolean {
  return (
    event.path.startsWith('/__nuxt_error')
    || getRequestHeader(event, 'x-nuxt-error') === 'true'
  )
}

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', (html, { event }) => {
    if (!isNuxtErrorRender(event)) return

    const robots = useRuntimeConfig(event)['nuxt-robots'] as
      | { header?: boolean, robotsDisabledValue?: string }
      | undefined
    const rule = robots?.robotsDisabledValue
    if (!rule) return

    if (robots.header) {
      setResponseHeader(event, 'X-Robots-Tag', rule)
    }
    html.head.push(`<meta name="robots" content="${rule}">`)
  })
})
