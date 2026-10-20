/**
 * One slow interaction as a browser reports it (`client:inp`): what was
 * tapped or typed into, how the time split across INP's three phases, and
 * which script ran longest during it. Built from web-vitals' attribution
 * by `buildInpReport` (`app/utils/inpReport.ts`) and cut back to exactly
 * this shape by `redactClientInpReport` (`server/utils/clientEventRedaction.ts`),
 * because the ingest route takes whatever a client sends.
 *
 * Nothing here can name a person: the target is a CSS selector of tag
 * names, ids and classes (never text or attribute values), the page is
 * its route NAME (never its path, which can carry a reset key), and a
 * script is its origin and path (never its query).
 */
export type InpReport = {
  /** The page's INP, in whole milliseconds. */
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  /** The route the interaction happened on, by name (`blog-post-id-slug___el`). */
  route?: string
  interactionType?: 'pointer' | 'keyboard'
  /** web-vitals' selector for the element interacted with, at most 100 characters. */
  target?: string
  loadState: 'loading' | 'dom-interactive' | 'dom-content-loaded' | 'complete'
  inputDelay: number
  processingDuration: number
  presentationDelay: number
  /** Long animation frames that overlapped the interaction (0 where the browser has no LoAF API). */
  longAnimationFrames: number
  totalScriptDuration?: number
  totalStyleAndLayoutDuration?: number
  totalPaintDuration?: number
  totalUnattributedDuration?: number
  longestScript?: InpLongestScript
}

export type InpLongestScript = {
  /** The script file: a same-origin `/_nuxt/` path, another origin's URL without its query, or `document` for the page's own inline code. */
  source: string
  /** What called it: an event listener (`BUTTON.onclick`), a timer, a promise, a script. */
  invoker: string
  invokerType: string
  functionName?: string
  subpart: 'input-delay' | 'processing-duration' | 'presentation-delay'
  /** How long the script overlapped the interaction, in whole milliseconds. */
  duration: number
  /** Style and layout the script forced (a forced reflow), in whole milliseconds. */
  forcedStyleAndLayout: number
}
