/**
 * TikTok Pixel event payloads.
 *
 * Names match TikTok's standard event catalogue verbatim — anything
 * else is silently treated as a custom event and excluded from
 * standard-event optimisation/attribution.
 *
 * Reference: https://business-api.tiktok.com/portal/docs?id=1739585696931842
 */

export type TikTokContent = {
  contentId: string
  contentType?: string
  contentName?: string
  price?: number
  quantity?: number
}

export type TikTokCommonData = {
  currency?: string
  value?: number
  contentId?: string
  contentType?: 'product' | 'product_group'
  contentName?: string
  contents?: TikTokContent[]
  description?: string
  query?: string
  orderId?: string
}
