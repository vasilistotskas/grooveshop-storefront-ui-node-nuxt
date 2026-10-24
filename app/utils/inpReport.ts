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

/** web-vitals' bound on a selector (its `getSelector`'s `MAX_LEN`), which the ingest enforces too. */
const MAX_SELECTOR_LENGTH = 100

/** The controls a press is meant for, so a tap on a label inside one names the control. */
const CONTROL = 'button, a, summary, input, select, textarea, label, [role="button"], [role="tab"], [role="menuitem"], [role="option"], [role="switch"], [role="checkbox"], [role="radio"]'

/**
 * An element as web-vitals' selectors describe one: tag names, `#id`s and
 * classes joined by `>`, nearest element last, at most 100 characters, up
 * to the first ancestor with an id. Never text or an attribute value.
 *
 * The 100 are a hard limit here, unlike in web-vitals: the ingest drops a
 * longer target, so a nearest element whose classes alone pass it keeps
 * its tag and the classes that fit.
 */
export function elementSelector(element: Element): string {
  let selector = ''
  let node: Element | null = element
  while (node) {
    const part = node.id
      ? `#${node.id}`
      : [node.nodeName.toLowerCase(), ...[...node.classList].sort()].join('.')
    if (selector.length + part.length > MAX_SELECTOR_LENGTH - 1) return selector || fitted(part)
    selector = selector ? `${part}>${selector}` : part
    if (node.id) break
    node = node.parentElement
  }
  return selector
}

/** A selector part cut to the limit at a class boundary: `button.a.b` loses `.b` before `.a`. */
function fitted(part: string): string {
  let out = ''
  for (const piece of part.split('.')) {
    const next = out ? `${out}.${piece}` : piece
    if (next.length > MAX_SELECTOR_LENGTH) break
    out = next
  }
  return out
}

/** A press long before an interaction's first event is not what started it. */
const PRESS_MATCH_MS = 2000

/**
 * The element each recent press landed on, noted while it is still in the
 * page.
 *
 * Chrome gives an interaction's event entries a `target` only while that
 * element is connected, so a tap that replaces its own button (a favourite
 * toggle swapping its icon, a link that navigates, an overlay that remounts)
 * reaches web-vitals with no element and reports no `interactionTarget`.
 * Those were most of webside's slow product-page taps (storefront #156).
 * Noting the control at `pointerdown` / `keydown`, when it is still there,
 * lets the report name it anyway.
 */
export function createPressLog(size = 20) {
  const presses: { time: number, target: string }[] = []
  return {
    /** A capture-phase `pointerdown` / `keydown` listener. */
    record(event: Event) {
      if (!(event.target instanceof Element)) return
      presses.push({ time: event.timeStamp, target: elementSelector(event.target.closest(CONTROL) ?? event.target) })
      if (presses.length > size) presses.shift()
    },
    /** The last press at or before `time` (an interaction's start), if it was recent. */
    targetAt(time: number | undefined): string | undefined {
      if (time === undefined) return undefined
      for (let i = presses.length - 1; i >= 0; i--) {
        const press = presses[i]!
        if (press.time <= time + 1) return time - press.time <= PRESS_MATCH_MS ? press.target : undefined
      }
      return undefined
    },
  }
}

const ms = (value: number) => Math.round(value)
const optionalMs = (value: number | undefined) => value === undefined ? undefined : ms(value)

/**
 * The report for one page's INP, built from web-vitals' attribution. The
 * phase timings are rounded to whole milliseconds; the long-animation-frame
 * fields are absent where the browser has no LoAF API (Safari, Firefox).
 * `pressedTarget` (`createPressLog`) names the element when web-vitals
 * could not, because it had left the page.
 */
export function buildInpReport(
  metric: INPMetricWithAttribution,
  route: string | undefined,
  pageOrigin: string,
  pressedTarget?: string,
): InpReport {
  const { attribution } = metric
  const longest = attribution.longestScript
  const target = attribution.interactionTarget || pressedTarget
  return {
    value: ms(metric.value),
    rating: metric.rating,
    ...(route ? { route } : {}),
    ...(attribution.interactionType ? { interactionType: attribution.interactionType } : {}),
    ...(target ? { target } : {}),
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
