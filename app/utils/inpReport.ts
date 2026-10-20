import type { INPMetricWithAttribution } from 'web-vitals/attribution'

/**
 * Where a page reports its INP, and what it reports
 * (`app/plugins/web-vitals.client.ts`).
 *
 * A page with a good INP (200 ms or less, web.dev's threshold, which is
 * what web-vitals' `rating` applies) reports nothing: the field data
 * already says how many pages are good, and what we cannot see from it is
 * WHICH interaction was slow, and why.
 */
export const INP_REPORTED_RATINGS: ReadonlySet<INPMetricWithAttribution['rating']> = new Set(['needs-improvement', 'poor'])

/** The route a page was on from a point in time, for the interaction's `route`. */
export type RouteSpan = { since: number, name: string }

/**
 * The route the page was on at `time` (a `performance.now()` timestamp):
 * the last span that began at or before it. A page's INP is one value for
 * the whole page load, across client-side navigations, so the route at
 * report time is not necessarily the one the slow interaction was on.
 */
export function routeAt(spans: readonly RouteSpan[], time: number | undefined): string | undefined {
  if (time === undefined) return spans.at(-1)?.name
  let name: string | undefined
  for (const span of spans) {
    if (span.since > time) break
    name = span.name
  }
  return name
}

/**
 * A script's file as it may be logged: a same-origin `/_nuxt/` chunk by
 * its path, another origin's script by origin and path, and anything else
 * on our own origin — the page's inline code, whose URL is the page's own
 * and can carry a password-reset key — as `document`. Never a query.
 */
export function scriptSource(url: string, pageOrigin: string): string {
  if (!url) return ''
  let parsed: URL
  try {
    parsed = new URL(url)
  }
  catch {
    return ''
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return ''
  if (parsed.origin !== pageOrigin) return `${parsed.origin}${parsed.pathname}`
  return parsed.pathname.startsWith('/_nuxt/') ? parsed.pathname : 'document'
}

/**
 * What called a script, as it may be logged. The browser names a listener
 * or callback by its target (`BUTTON#id.onclick`, `Window.setTimeout`),
 * but a classic script by its URL, which goes through `scriptSource`.
 */
function scriptInvoker(invoker: string, pageOrigin: string): string {
  return /^https?:\/\//.test(invoker) ? scriptSource(invoker, pageOrigin) : invoker
}

const ms = (value: number) => Math.round(value)
const optionalMs = (value: number | undefined) => value === undefined ? undefined : ms(value)

/**
 * The report for one page's INP, built from web-vitals' attribution. The
 * phase timings are rounded to whole milliseconds; the long-animation-frame
 * fields are absent where the browser has no LoAF API (Safari, Firefox).
 */
export function buildInpReport(
  metric: INPMetricWithAttribution,
  route: string | undefined,
  pageOrigin: string,
): InpReport {
  const { attribution } = metric
  const longest = attribution.longestScript
  return {
    value: ms(metric.value),
    rating: metric.rating,
    ...(route ? { route } : {}),
    ...(attribution.interactionType ? { interactionType: attribution.interactionType } : {}),
    ...(attribution.interactionTarget ? { target: attribution.interactionTarget } : {}),
    loadState: attribution.loadState,
    inputDelay: ms(attribution.inputDelay),
    processingDuration: ms(attribution.processingDuration),
    presentationDelay: ms(attribution.presentationDelay),
    longAnimationFrames: attribution.longAnimationFrameEntries.length,
    totalScriptDuration: optionalMs(attribution.totalScriptDuration),
    totalStyleAndLayoutDuration: optionalMs(attribution.totalStyleAndLayoutDuration),
    totalPaintDuration: optionalMs(attribution.totalPaintDuration),
    totalUnattributedDuration: optionalMs(attribution.totalUnattributedDuration),
    ...(longest
      ? {
          longestScript: {
            source: scriptSource(longest.entry.sourceURL, pageOrigin),
            invoker: scriptInvoker(longest.entry.invoker, pageOrigin),
            invokerType: longest.entry.invokerType,
            ...(longest.entry.sourceFunctionName ? { functionName: longest.entry.sourceFunctionName } : {}),
            subpart: longest.subpart,
            duration: ms(longest.intersectingDuration),
            forcedStyleAndLayout: ms(longest.entry.forcedStyleAndLayoutDuration),
          },
        }
      : {}),
  }
}
