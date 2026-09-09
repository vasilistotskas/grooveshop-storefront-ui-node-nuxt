/**
 * Typed wrapper around the OpenAI / ChatGPT Ads measurement pixel
 * (``oaiq``).
 *
 * Why hand-rolled rather than a registry entry: ``@nuxt/scripts`` ships
 * registry helpers for Google Analytics, Meta and TikTok, but has none
 * for OpenAI. So the script is registered with the generic
 * ``useScript`` in ``setupOpenAIPixelConsent`` and this composable
 * gives call sites a typed surface over it.
 *
 * **This was rewritten on 2026-09-09 because the first version sent
 * events the pixel silently discarded.** It modelled OpenAI on Meta —
 * ``oaiq('track', 'Purchase', { value, content_ids, num_items })`` —
 * and none of those three things is right
 * (https://developers.openai.com/ads/measurement-pixel):
 *
 * - the command is ``measure``, not ``track``;
 * - event names are a snake_case taxonomy (``order_created``,
 *   ``items_added``, …), not Meta's PascalCase;
 * - money is an integer in the currency's ISO 4217 **minor unit**
 *   (``2599`` for €25.99), under ``amount`` rather than ``value``, and
 *   line items go in a ``contents`` array rather than parallel
 *   ``content_ids``/``num_items`` fields.
 *
 * The pixel initialised fine throughout, so nothing looked broken: the
 * SDK just drops unknown commands and events without logging. Every
 * conversion since the pixel shipped was lost.
 *
 * The exported helpers are therefore named after OpenAI's own events
 * rather than a house style — a call site that reads
 * ``trackOrderCreated`` cannot quietly drift back to Meta's vocabulary.
 *
 * Two reasons for wrapping, unchanged:
 *
 * 1. **Consent gating.** Nothing may fire until the shopper grants
 *    ``ad_storage`` through the cookie banner.
 *    ``setupOpenAIPixelConsent`` registers the script behind the
 *    consent trigger; this composable short-circuits when the id is
 *    missing.
 * 2. **No-op posture in dev / SSR.** Every event is browser-only, so
 *    call sites never have to ``import.meta.client``-guard.
 *
 * There is no server-side leg (OpenAI's Conversions API is not wired
 * up), so no ``event_id`` is sent — it exists only to dedupe a browser
 * event against a server one.
 */

const NOOP_PROXY = new Proxy(() => undefined, {
  get: () => () => undefined,
  apply: () => undefined,
})

/**
 * The subset of https://developers.openai.com/ads/supported-events this
 * storefront emits. Deliberately not the full taxonomy: an exported
 * helper nothing calls is an untested guess at a payload shape.
 */
type OaiqEventName
  = | 'contents_viewed'
    | 'items_added'
    | 'checkout_started'
    | 'order_created'

type OaiqTracker = (command: string, ...args: unknown[]) => void

/** One line item, as OpenAI's ``contents`` array expects it. */
export type OpenAIContent = {
  id: string
  name?: string
  contentType?: string
  quantity?: number
}

export type OpenAIEventData = {
  /** Major units, e.g. `25.99`. Converted to minor units on the way out. */
  amount?: number
  currency?: string
  contents?: OpenAIContent[]
}

/**
 * Convert a major-unit amount to the ISO 4217 minor unit OpenAI wants.
 *
 * Not a hardcoded ``* 100``: the exponent is currency-specific (JPY has
 * none, so ¥2599 is `2599`, while €25.99 is also `2599`). ``Intl``
 * already knows the table, so ask it rather than keep a copy that goes
 * stale.
 *
 * Exported for tests — getting this wrong misreports revenue by 100x in
 * whichever direction, and the pixel would accept it silently.
 */
export function toMinorUnits(amount: number, currency: string): number {
  let digits: number
  try {
    digits
      = new Intl.NumberFormat('en', { style: 'currency', currency })
        .resolvedOptions().maximumFractionDigits ?? 2
  }
  catch {
    // Unknown/malformed currency code — Intl throws rather than
    // guessing. Two decimals is right for all but a handful of
    // currencies, and this store is EUR-only.
    digits = 2
  }
  return Math.round(amount * 10 ** digits)
}

function toOpenAIPayload(data: OpenAIEventData | undefined) {
  const out: Record<string, unknown> = {}
  if (!data) return out

  if (data.amount !== undefined && data.currency) {
    out.amount = toMinorUnits(data.amount, data.currency)
  }
  if (data.currency !== undefined) out.currency = data.currency

  if (data.contents?.length) {
    // ``type`` tells the pixel which shape the event carries; the
    // documented ecommerce example sets it alongside ``contents``.
    out.type = 'contents'
    out.contents = data.contents.map(item => ({
      id: item.id,
      ...(item.name !== undefined && { name: item.name }),
      ...(item.contentType !== undefined && { content_type: item.contentType }),
      ...(item.quantity !== undefined && { quantity: item.quantity }),
    }))
  }
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

  function measure(event: OaiqEventName, data?: OpenAIEventData): void {
    tracker()('measure', event, toOpenAIPayload(data))
  }

  return {
    isProvisioned,
    trackContentsViewed: (data?: OpenAIEventData) =>
      measure('contents_viewed', data),
    trackItemsAdded: (data?: OpenAIEventData) => measure('items_added', data),
    trackCheckoutStarted: (data?: OpenAIEventData) =>
      measure('checkout_started', data),
    trackOrderCreated: (data?: OpenAIEventData) =>
      measure('order_created', data),
  }
}
