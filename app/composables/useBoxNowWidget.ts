/**
 * BoxNow locker-picker widget utilities.
 *
 * All exports are pure functions (no useFetch, no useState, no DOM access).
 * They are unit-testable in a plain Node environment — the explicit
 * import below (rather than relying on Nuxt auto-import) is what keeps
 * that true: ``test/unit/**`` loads this file directly, with no
 * auto-import transform in front of it. Mirrors ``shared/utils/csp.ts``,
 * which explicitly imports its own sibling constants module for the
 * same reason.
 */
import {
  BOXNOW_FRAME_ORIGINS,
  boxNowWidgetCountry,
  boxNowAlpha2FromPostMessageName,
} from '#shared/utils/boxnow-widget'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BoxNowSelectedLocker {
  /** BoxNow APM identifier, e.g. "4" */
  boxnowLockerId: string
  boxnowLockerPostalCode: string
  boxnowLockerAddressLine1: string
  boxnowLockerAddressLine2?: string
  boxnowLockerName?: string
  boxnowLockerNote?: string
  boxnowLockerLat?: string
  boxnowLockerLng?: string
  boxnowLockerImage?: string
  /**
   * ISO alpha-2 the widget resolved the selected locker to (``GR``/``CY``),
   * derived case-insensitively from the widget's own ``boxnowCountry``
   * postMessage field (``"greece"``/``"cyprus"``). Absent when the
   * widget didn't send a recognised value — callers fall back to the
   * checkout's own delivery country in that case.
   */
  boxnowLockerCountryCode?: string
}

export interface BoxNowWidgetUrlOptions {
  /** BoxNow partner ID (required). */
  partnerId: string | number
  /**
   * ISO alpha-2 destination country (``GR``/``CY``) — selects both the
   * widget host and the ``countryCode`` query param. Required: BoxNow
   * has no country-agnostic widget host.
   */
  countryCode: string
  /**
   * Widget display mode.
   * @default 'iframe'
   */
  type?: 'iframe' | 'popup' | 'navigate' | 'navigateen'
  /**
   * Widget UI language (ISO 639-1 code, ``el``/``en``). See
   * ``widgetLanguageForLocale`` for the verified mapping.
   * @default 'el'
   */
  language?: string
  /** Pre-select a locker by its external ID. */
  lockerId?: string
  /** Pre-filter lockers by postal code. */
  zip?: string
  /**
   * Request geolocation to centre the map on the user.
   * @default true
   */
  gps?: boolean
  /**
   * Auto-select the nearest locker if only one is visible.
   * @default true
   */
  autoselect?: boolean
  /**
   * Close the widget iframe automatically after selection.
   * @default false
   */
  autoclose?: boolean
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Explicit allowlist of origins from which BoxNow widget postMessage
 * events are accepted. **Must stay in sync with the CSP ``frame-src``**
 * directive at ``server/middleware/3.csp.ts`` — both derive from
 * ``shared/utils/boxnow-widget.ts``.
 */
export const BOXNOW_ALLOWED_ORIGINS: readonly string[] = BOXNOW_FRAME_ORIGINS

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Map a storefront i18n locale to the BoxNow widget's ``language``
 * query param.
 *
 * Verified 2026-09-27 by fetching
 * ``https://widget-v5.boxnow.gr/functions/loadTranslations.js`` and
 * ``globalState.js``: ``language`` is read verbatim into
 * ``globalState.languageIs``, then aliased (``{el: 'gr', cy: 'gr', sl:
 * 'si'}``) and checked against the widget's known translation set
 * (``en``, ``gr``, ``bg``, ``hr``, ``si``); anything else falls back
 * to English. So ``el`` aliases to ``gr`` (Greek widget copy) and
 * ``en`` is already a known language — both storefront locales pass
 * straight through unchanged. Kept as an explicit map (not an
 * identity function) so a future storefront locale outside this pair
 * is a deliberate decision here rather than a silent English fallback
 * inside BoxNow's own script.
 */
export function widgetLanguageForLocale(locale: string): string {
  return locale === 'en' ? 'en' : 'el'
}

/**
 * Build the BoxNow widget iframe URL from the given options.
 *
 * @throws {Error} When `partnerId` is missing or empty, or when
 *   `countryCode` has no BoxNow widget mapping (see
 *   {@link boxNowWidgetCountry}).
 */
export function buildBoxNowIframeUrl(options: BoxNowWidgetUrlOptions): string {
  const {
    partnerId,
    countryCode,
    type = 'iframe',
    language = 'el',
    lockerId,
    zip,
    gps = true,
    autoselect = true,
    autoclose = false,
  } = options

  if (partnerId === '' || partnerId === null || partnerId === undefined) {
    throw new Error('partnerId is required')
  }

  const widgetCountry = boxNowWidgetCountry(countryCode)
  if (!widgetCountry) {
    throw new Error(`Unsupported BoxNow country: ${countryCode}`)
  }

  const params = new URLSearchParams()
  params.set('partnerId', String(partnerId))
  params.set('type', type)
  params.set('language', language)
  params.set('countryCode', widgetCountry.param)
  params.set('gps', gps ? 'yes' : 'no')
  params.set('autoselect', autoselect ? 'yes' : 'no')
  params.set('autoclose', autoclose ? 'yes' : 'no')

  if (lockerId !== undefined && lockerId !== '') {
    params.set('lockerId', lockerId)
  }
  if (zip !== undefined && zip !== '') {
    params.set('zip', zip)
  }

  return `${widgetCountry.origin}/iframe.html?${params.toString()}`
}

/**
 * Returns ``true`` if the given message origin should be trusted for
 * BoxNow postMessage events. Strictly bounded to {@link BOXNOW_ALLOWED_ORIGINS}
 * — the previous regex fallback (``map``/``widget-new`` subdomains) was
 * dropped because the CSP ``frame-src`` doesn't list those origins, so
 * they can't host an iframe on our page anyway. Trusting their messages
 * was open surface for nothing.
 */
export function isBoxNowAllowedOrigin(origin: string): boolean {
  return (BOXNOW_ALLOWED_ORIGINS as readonly string[]).includes(origin)
}

/**
 * Type-safe parser for the `event.data` payload emitted by the BoxNow widget
 * iframe via `window.postMessage`.
 *
 * Returns a normalised {@link BoxNowSelectedLocker} when the payload contains
 * the three required fields (`boxnowLockerId`, `boxnowLockerPostalCode`,
 * `boxnowLockerAddressLine1`), otherwise returns `null`.
 *
 * Intentionally avoids Zod to keep this utility dependency-free.
 */
export function parseBoxNowSelectedLocker(data: unknown): BoxNowSelectedLocker | null {
  if (data === null || typeof data !== 'object') {
    return null
  }

  const d = data as Record<string, unknown>

  // Required fields — all must be non-empty strings.
  if (
    typeof d.boxnowLockerId !== 'string' || d.boxnowLockerId === ''
    || typeof d.boxnowLockerPostalCode !== 'string' || d.boxnowLockerPostalCode === ''
    || typeof d.boxnowLockerAddressLine1 !== 'string' || d.boxnowLockerAddressLine1 === ''
  ) {
    return null
  }

  const locker: BoxNowSelectedLocker = {
    boxnowLockerId: d.boxnowLockerId,
    boxnowLockerPostalCode: d.boxnowLockerPostalCode,
    boxnowLockerAddressLine1: d.boxnowLockerAddressLine1,
  }

  // Optional fields — include only when they are non-empty strings.
  if (typeof d.boxnowLockerAddressLine2 === 'string' && d.boxnowLockerAddressLine2 !== '') {
    locker.boxnowLockerAddressLine2 = d.boxnowLockerAddressLine2
  }
  if (typeof d.boxnowLockerName === 'string' && d.boxnowLockerName !== '') {
    locker.boxnowLockerName = d.boxnowLockerName
  }
  if (typeof d.boxnowLockerNote === 'string' && d.boxnowLockerNote !== '') {
    locker.boxnowLockerNote = d.boxnowLockerNote
  }
  if (typeof d.boxnowLockerLat === 'string' && d.boxnowLockerLat !== '') {
    locker.boxnowLockerLat = d.boxnowLockerLat
  }
  if (typeof d.boxnowLockerLng === 'string' && d.boxnowLockerLng !== '') {
    locker.boxnowLockerLng = d.boxnowLockerLng
  }
  if (typeof d.boxnowLockerImage === 'string' && d.boxnowLockerImage !== '') {
    locker.boxnowLockerImage = d.boxnowLockerImage
  }
  // ``boxnowCountry`` — validated case-insensitively against the known
  // widget postMessage names (``"greece"``/``"cyprus"``) and normalised
  // to our ISO alpha-2. Absent or unrecognised → omitted, not an error:
  // the carrier adapter falls back to the checkout's own delivery
  // country when this is missing.
  if (typeof d.boxnowCountry === 'string' && d.boxnowCountry !== '') {
    const alpha2 = boxNowAlpha2FromPostMessageName(d.boxnowCountry)
    if (alpha2) {
      locker.boxnowLockerCountryCode = alpha2
    }
  }

  return locker
}
