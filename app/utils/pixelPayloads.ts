/**
 * Translate the camelCase ``MetaCommonData`` fields into the exact
 * snake_case names Meta's pixel + Conversions API expect. Non-trivial:
 * a key mismatch (``contentIds`` vs ``content_ids``) silently
 * disables event matching — Meta drops the field rather than warning.
 * Reference: https://developers.facebook.com/docs/meta-pixel/reference
 */
export function toMetaPayload(data: MetaCommonData | undefined): Record<string, unknown> {
  if (!data) return {}
  const out: Record<string, unknown> = {}
  if (data.value !== undefined) out.value = data.value
  if (data.currency !== undefined) out.currency = data.currency
  if (data.contentName !== undefined) out.content_name = data.contentName
  if (data.contentCategory !== undefined) out.content_category = data.contentCategory
  if (data.contentType !== undefined) out.content_type = data.contentType
  if (data.contentIds !== undefined) out.content_ids = data.contentIds
  if (data.numItems !== undefined) out.num_items = data.numItems
  if (data.orderId !== undefined) out.order_id = data.orderId
  if (data.searchString !== undefined) out.search_string = data.searchString
  if (data.status !== undefined) out.status = data.status
  if (data.predictedLtv !== undefined) out.predicted_ltv = data.predictedLtv
  if (data.contents !== undefined) {
    out.contents = data.contents.map(c => ({
      ...(c.id !== undefined ? { id: c.id } : {}),
      ...(c.quantity !== undefined ? { quantity: c.quantity } : {}),
      ...(c.itemPrice !== undefined ? { item_price: c.itemPrice } : {}),
    }))
  }
  return out
}

/**
 * Translate the camelCase ``TikTokCommonData`` fields into the exact
 * snake_case names TikTok's pixel expects. A key mismatch
 * (``contentId`` vs ``content_id``) silently disables value/content
 * matching — TikTok drops the field rather than warning.
 * Reference: https://business-api.tiktok.com/portal/docs?id=1739585696931842
 */
export function toTikTokPayload(
  data: TikTokCommonData | undefined,
): Record<string, unknown> {
  if (!data) return {}
  const out: Record<string, unknown> = {}
  if (data.value !== undefined) out.value = data.value
  if (data.currency !== undefined) out.currency = data.currency
  if (data.contentId !== undefined) out.content_id = data.contentId
  if (data.contentType !== undefined) out.content_type = data.contentType
  if (data.contentName !== undefined) out.content_name = data.contentName
  if (data.description !== undefined) out.description = data.description
  if (data.query !== undefined) out.query = data.query
  if (data.orderId !== undefined) out.order_id = data.orderId
  if (data.contents !== undefined) {
    out.contents = data.contents.map(c => ({
      content_id: c.contentId,
      ...(c.contentType !== undefined ? { content_type: c.contentType } : {}),
      ...(c.contentName !== undefined ? { content_name: c.contentName } : {}),
      ...(c.price !== undefined ? { price: c.price } : {}),
      ...(c.quantity !== undefined ? { quantity: c.quantity } : {}),
    }))
  }
  return out
}
