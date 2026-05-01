/**
 * GA4 ecommerce event payloads.
 *
 * Field names mirror Google's spec verbatim (snake_case ``item_id``,
 * ``item_name``, ``transaction_id``, ``currency``, ``value``, ``items``).
 * Don't deviate — GA4 silently drops unknown fields rather than
 * warning, which is the most common cause of "events fire but
 * Enhanced Ecommerce reports are empty" in audits.
 *
 * Reference: https://developers.google.com/analytics/devguides/collection/ga4/reference/events
 */

export type GA4Item = {
  item_id?: string
  item_name?: string
  item_brand?: string
  item_category?: string
  item_category2?: string
  item_variant?: string
  item_list_id?: string
  item_list_name?: string
  index?: number
  price?: number
  quantity?: number
  discount?: number
  coupon?: string
  affiliation?: string
  currency?: string
}

export type GA4CommonData = {
  currency?: string
  value?: number
  items?: GA4Item[]
}

export type GA4PurchaseData = GA4CommonData & {
  transaction_id: string
  tax?: number
  shipping?: number
  coupon?: string
  affiliation?: string
}

export type GA4RefundData = GA4CommonData & {
  transaction_id: string
}

export type GA4CheckoutData = GA4CommonData & {
  coupon?: string
}

export type GA4ShippingData = GA4CheckoutData & {
  shipping_tier?: string
}

export type GA4PaymentData = GA4CheckoutData & {
  payment_type?: string
}

export type GA4SearchData = {
  search_term: string
}

export type GA4SignUpData = {
  method?: string
}

export type GA4LoginData = {
  method?: string
}

export type GA4ItemListData = GA4CommonData & {
  item_list_id?: string
  item_list_name?: string
}

export type GA4SelectItemData = GA4ItemListData
