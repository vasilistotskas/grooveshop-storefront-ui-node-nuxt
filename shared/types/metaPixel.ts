/**
 * Meta Pixel event payloads.
 *
 * Names match Meta's standard event catalogue verbatim. Don't
 * customise — using anything other than the exact spelling kills
 * attribution because the server-side Conversions API event won't
 * dedup against the browser pixel event.
 *
 * Reference: https://developers.facebook.com/docs/meta-pixel/reference
 */

export type MetaContent = {
  id?: string
  quantity?: number
  itemPrice?: number
}

export type MetaCommonData = {
  currency?: string
  value?: number
  contentName?: string
  contentCategory?: string
  contentType?: 'product' | 'product_group'
  contentIds?: string[]
  contents?: MetaContent[]
  numItems?: number
  orderId?: string
  searchString?: string
  status?: string
  predictedLtv?: number
}

export type MetaTrackOptions = {
  /**
   * Server-side dedup id. Pair this with the same value the Django
   * Conversions API dispatcher uses so Meta collapses the browser
   * event and the server event into one. When omitted the
   * composable mints a fresh UUID for browser-only events.
   */
  eventID?: string
}
