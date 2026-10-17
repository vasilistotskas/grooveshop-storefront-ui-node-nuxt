/**
 * The query params an ad or a campaign appends to a landing URL: they say
 * where the visitor came from, never what the page shows.
 *
 * One list, three readers that must agree:
 *
 * - `useOrderAttribution` records WHICH click ids were on the landing URL
 *   (`CLICK_ID_PARAMS`, exactly Django's `ClickIdsEnum`).
 * - `server/plugins/tracking-params.ts` leaves them out of the page cache
 *   key and out of the SSR render (`isTrackingParam`).
 * - `app/plugins/tracking-location.client.ts` keeps them in the browser's
 *   address bar, which the consent-gated pixels read.
 *
 * Add a param here only if no page, filter or redirect reads it: it
 * stops reaching the server render, and every URL differing only in it
 * becomes ONE cache entry. The browser still has it.
 */

/**
 * The click-id params whose presence an order records. A `Record` over
 * the generated enum, so a param added or dropped on either side fails
 * the type check instead of drifting.
 */
export const CLICK_ID_PARAMS: Record<ClickIdsEnum, true> = {
  gclid: true,
  gbraid: true,
  wbraid: true,
  msclkid: true,
  ttclid: true,
  twclid: true,
  li_fat_id: true,
  epik: true,
  fbclid: true,
}

/** Google Ads' auto-tagging marker, sent next to `gclid`. */
const OTHER_TRACKING_PARAMS: readonly string[] = ['gad_source']

/** Every `utm_*` tag (source, medium, campaign, term, content, id). */
export const UTM_PARAM_PREFIX = 'utm_'

export const TRACKING_PARAMS: ReadonlySet<string> = new Set([
  ...Object.keys(CLICK_ID_PARAMS),
  ...OTHER_TRACKING_PARAMS,
])
