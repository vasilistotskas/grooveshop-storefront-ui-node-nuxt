/**
 * A page's slow interaction into the logs (`log.source:client`,
 * `action:client:inp`), with what made it slow.
 *
 * CrUX gives webside.gr an INP of 215 ms at p75 (28 days to 2026-10-17)
 * and nothing else: not the page, the element or the script. web-vitals'
 * attribution build measures INP the way Chrome does and says, for the
 * interaction that set it, what was interacted with, how long each phase
 * took (input delay, processing, presentation) and, where the browser has
 * the Long Animation Frames API, which script ran longest.
 *
 * web-vitals reports the page's INP once, when the page is hidden or
 * unloaded, so a page sends at most one event, and only when its INP is
 * not good (`INP_REPORTED_RATINGS`). It goes out at `warn` through evlog's
 * client transport, so the ingest samples it at the `warn` rate of
 * `sampling.rates`, and `server/plugins/evlog-client-context.ts` cuts it
 * back to the `InpReport` allowlist before it is printed.
 *
 * The library loads once the app is ready, in a chunk of its own, so it
 * adds nothing to the entry chunk the page parses before hydrating. It
 * reads the browser's buffered event and long-animation-frame entries, so
 * a slow interaction from before it loaded is still seen.
 */
export default defineNuxtPlugin(() => {
  const router = useRouter()
  const spans: RouteSpan[] = [{ since: 0, name: String(router.currentRoute.value.name ?? '') }]
  router.afterEach((to) => {
    spans.push({ since: performance.now(), name: String(to.name ?? '') })
  })

  onNuxtReady(async () => {
    const { onINP } = await import('web-vitals/attribution')
    onINP((metric) => {
      if (!INP_REPORTED_RATINGS.has(metric.rating)) return
      const route = routeAt(spans, metric.attribution.interactionTime)
      log.warn({ action: 'client:inp', inp: buildInpReport(metric, route, window.location.origin) })
    })
  })
})
