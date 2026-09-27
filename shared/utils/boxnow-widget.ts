/**
 * BoxNow widget host/country mapping — the single source of truth for
 * every BoxNow origin the storefront trusts or embeds.
 *
 * Import-free by design (like ``csp.ts``, which reads
 * {@link BOXNOW_FRAME_ORIGINS} at both build time and per-request):
 *   - ``shared/utils/csp.ts`` builds the ``frame-src`` directive from
 *     {@link BOXNOW_FRAME_ORIGINS}.
 *   - ``app/composables/useBoxNowWidget.ts`` builds
 *     ``BOXNOW_ALLOWED_ORIGINS`` (postMessage trust) from the same list
 *     and resolves the per-country iframe URL via
 *     {@link boxNowWidgetCountry}.
 *
 * Verified against BoxNow's own scripts 2026-09-27 (curl against
 * ``widget-v5.boxnow.gr``):
 *   - ``globalState.js`` reads ``countryCode`` from the query string and
 *     validates it against ``gr|bg|cy|hr|si`` (``codeToCountry.js``).
 *   - The CY widget 302-redirects ``iframe.html`` to the same host with
 *     ``countryCode=cy`` appended — same shape as the GR redirect to
 *     ``widget-v4.boxnow.gr`` / ``widget.boxnow.gr``.
 *   - postMessage on locker selection carries ``boxnowCountry`` as the
 *     lowercase English country name (``codeToCountry()``): ``"greece"``
 *     / ``"cyprus"``.
 *
 * Only GR and CY are verified as live BoxNow markets for this store —
 * the previous ``bg``/``hr`` frame-src entries were unverified guesses
 * and are dropped. Add a country here only once its origin has been
 * confirmed live, the same way GR/CY were.
 */

export interface BoxNowWidgetCountryConfig {
  /** Widget host for this country, e.g. ``https://widget-v5.boxnow.gr``. */
  origin: string
  /** The ``countryCode`` query param value the widget expects (lowercase alpha-2-ish: ``gr``/``cy``). */
  param: string
  /** The lowercase English country name the widget's postMessage payload carries under ``boxnowCountry``. */
  postMessageName: string
}

/** ISO alpha-2 → widget config, for every BoxNow market this store supports. */
export const BOXNOW_WIDGET_COUNTRIES: Record<string, BoxNowWidgetCountryConfig> = {
  GR: {
    origin: 'https://widget-v5.boxnow.gr',
    param: 'gr',
    postMessageName: 'greece',
  },
  CY: {
    origin: 'https://widget-v5.boxnow.cy',
    param: 'cy',
    postMessageName: 'cyprus',
  },
}

/**
 * Origins BoxNow's CDN redirects the iframe to mid-flight (both
 * observed as HTTP redirect hops from the ``.gr`` widget). CSP
 * validates every hop of a frame's redirect chain against
 * ``frame-src``, so these must be listed even though
 * {@link buildBoxNowIframeUrl} never targets them directly.
 */
export const BOXNOW_WIDGET_REDIRECT_ORIGINS: readonly string[] = [
  'https://widget-v4.boxnow.gr',
  'https://widget.boxnow.gr',
]

/**
 * Every origin that may legitimately host a BoxNow iframe on our
 * page — the per-country widget hosts plus the known redirect hops.
 * Consumed by ``shared/utils/csp.ts`` (``frame-src``) and
 * ``app/composables/useBoxNowWidget.ts`` (postMessage trust).
 */
export const BOXNOW_FRAME_ORIGINS: readonly string[] = [
  ...Object.values(BOXNOW_WIDGET_COUNTRIES).map(config => config.origin),
  ...BOXNOW_WIDGET_REDIRECT_ORIGINS,
]

/**
 * Resolve the widget config for an ISO alpha-2 country code
 * (case-insensitive). Returns ``null`` for a country BoxNow doesn't
 * serve — callers use this to disable the BoxNow option entirely
 * rather than build a URL for an origin that doesn't exist.
 */
export function boxNowWidgetCountry(alpha2: string | null | undefined): BoxNowWidgetCountryConfig | null {
  if (!alpha2) return null
  return BOXNOW_WIDGET_COUNTRIES[alpha2.toUpperCase()] ?? null
}

/**
 * Reverse-lookup: the lowercase English country name the widget's
 * postMessage payload carries (``boxnowCountry``) back to our ISO
 * alpha-2 code. Case-insensitive — the widget's own ``codeToCountry()``
 * always lowercases, but we don't rely on that holding forever.
 */
export function boxNowAlpha2FromPostMessageName(name: string | null | undefined): string | null {
  if (!name) return null
  const lowered = name.toLowerCase()
  for (const [alpha2, config] of Object.entries(BOXNOW_WIDGET_COUNTRIES)) {
    if (config.postMessageName === lowered) return alpha2
  }
  return null
}
