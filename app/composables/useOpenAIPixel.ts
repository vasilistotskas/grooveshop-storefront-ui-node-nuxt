/**
 * Typed wrapper around the OpenAI / ChatGPT Ads conversion pixel
 * (``oaiq``).
 *
 * Why hand-rolled rather than a registry entry: ``@nuxt/scripts`` ships
 * registry helpers for Google Analytics, Meta and TikTok, but has none
 * for OpenAI. So the script is registered with the generic
 * ``useScript`` in ``setupOpenAIPixelConsent`` and this composable
 * mirrors ``useTikTokPixel``'s shape so call sites look the same.
 *
 * Same two reasons for wrapping as the other pixels:
 *
 * 1. **Consent gating.** Nothing may fire until the shopper grants
 *    ``ad_storage`` through the cookie banner.
 *    ``setupOpenAIPixelConsent`` registers the script behind the consent
 *    trigger; this composable short-circuits when the id is missing.
 * 2. **No-op posture in dev / SSR.** Every event is browser-only, so
 *    call sites never have to ``import.meta.client``-guard.
 *
 * Like TikTok and unlike Meta, there is **no server-side leg** — no
 * Conversions-API equivalent — so there is no ``event_id`` to dedup
 * against. If OpenAI ever ships a server API, the shared id would come
 * from ``order.metaEventIds``-style plumbing on the Django side.
 */

const NOOP_PROXY = new Proxy(() => undefined, {
  get: () => () => undefined,
  apply: () => undefined,
})

/** Event names OpenAI's conversion measurement accepts. */
type OaiqEventName
  = | 'ViewContent'
    | 'AddToCart'
    | 'InitiateCheckout'
    | 'Purchase'
    | 'Search'
    | 'CompleteRegistration'

type OaiqTracker = (
  command: string,
  ...args: unknown[]
) => void

export type OpenAICommonData = {
  value?: number
  currency?: string
  contentId?: string
  contentIds?: string[]
  contentType?: string
  contentName?: string
  orderId?: string
  numItems?: number
  query?: string
}

/**
 * Translate camelCase fields into the snake_case names the pixel
 * expects. Same trap as TikTok: a key mismatch is not an error, the
 * field is simply dropped, so value/content matching silently stops
 * working with no console output.
 */
function toOpenAIPayload(
  data: OpenAICommonData | undefined,
): Record<string, unknown> {
  if (!data) return {}
  const out: Record<string, unknown> = {}
  if (data.value !== undefined) out.value = data.value
  if (data.currency !== undefined) out.currency = data.currency
  if (data.contentId !== undefined) out.content_id = data.contentId
  if (data.contentIds !== undefined) out.content_ids = data.contentIds
  if (data.contentType !== undefined) out.content_type = data.contentType
  if (data.contentName !== undefined) out.content_name = data.contentName
  if (data.orderId !== undefined) out.order_id = data.orderId
  if (data.numItems !== undefined) out.num_items = data.numItems
  if (data.query !== undefined) out.query = data.query
  return out
}

export function useOpenAIPixel() {
  const tenantStore = useTenantStore()
  // Tenant-only — no platform/env fallback, same rule as the other
  // pixels: a shared id would mix ad accounts across merchants.
  const pixelId = tenantStore.openaiPixelId

  const isProvisioned = !!pixelId

  function tracker(): OaiqTracker {
    if (!isProvisioned || import.meta.server) {
      return NOOP_PROXY as unknown as OaiqTracker
    }
    const oaiq = (window as unknown as { oaiq?: OaiqTracker }).oaiq
    // The script is injected only after consent is granted, so before
    // that `window.oaiq` is genuinely absent — not an error state.
    return oaiq ?? (NOOP_PROXY as unknown as OaiqTracker)
  }

  function track(event: OaiqEventName, data?: OpenAICommonData): void {
    tracker()('track', event, toOpenAIPayload(data))
  }

  return {
    isProvisioned,
    trackViewContent: (data?: OpenAICommonData) => track('ViewContent', data),
    trackAddToCart: (data?: OpenAICommonData) => track('AddToCart', data),
    trackInitiateCheckout: (data?: OpenAICommonData) =>
      track('InitiateCheckout', data),
    trackPurchase: (data?: OpenAICommonData) => track('Purchase', data),
    trackSearch: (data?: OpenAICommonData) => track('Search', data),
    trackCompleteRegistration: (data?: OpenAICommonData) =>
      track('CompleteRegistration', data),
  }
}
