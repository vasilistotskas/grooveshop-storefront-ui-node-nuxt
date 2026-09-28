/**
 * BoxNow widget — host/country mapping, iframe URL builder, and
 * postMessage handling. Single source of truth for every BoxNow origin
 * the storefront trusts or embeds, and for the widget-facing types
 * (`app/components/Checkout/BoxNowLockerPicker.vue`,
 * `SelectedBoxNowLocker.vue`, `shared/shipping/providers/boxnow.ts`
 * all consume these via auto-import).
 *
 * Lives in `shared/utils/` (not `app/composables/`) for two reasons:
 *   - `shared/utils/csp.ts` needs {@link BOXNOW_FRAME_ORIGINS} for the
 *     `frame-src` directive, and cross-file imports between `shared/`
 *     siblings use plain relative paths — pulling this from
 *     `app/composables/` would need the `#shared/` alias the other
 *     direction, which is banned in `app/**` (`no-restricted-imports`:
 *     everything under `shared/` auto-imports into `app/`, so an
 *     explicit import is always the wrong direction).
 *   - Import-free (no Nuxt/Vue APIs), so it stays unit-testable in a
 *     plain Node environment (`test/unit/**` loads it directly, with no
 *     auto-import transform in front of it).
 *
 * Verified against BoxNow's own scripts 2026-09-27 (curl against
 * ``widget-v5.boxnow.gr``):
 *   - ``globalState.js`` reads ``countryCode`` from the query string and
 *     validates it against ``gr|bg|cy|hr|si`` (``codeToCountry.js``).
 *   - The CY widget 302-redirects ``iframe.html`` to the same host with
 *     ``countryCode=cy`` appended — same shape as the GR redirect to
 *     ``widget-v4.boxnow.gr`` / ``widget.boxnow.gr``.
 *   - postMessage on locker selection (``functions/markerClicked.js``)
 *     carries ``boxnowCountry`` as the selected locker's own ``country``
 *     field — the ISO alpha-2 code BoxNow stores on every locker record
 *     (``globallockersprod…/PROD/<country>/lockers/<id>.json``):
 *     ``"GR"`` for locker 4, ``"CY"`` for locker 5795 (re-checked
 *     2026-09-28). The lowercase names in ``codeToCountry.js``
 *     (``"greece"``/``"cyprus"``) are only the storage PATH segment and
 *     never reach the message.
 *   - ``functions/loadTranslations.js`` reads ``language`` verbatim into
 *     ``globalState.languageIs``, aliases it (``{el: 'gr', cy: 'gr', sl:
 *     'si'}``), and falls back to English for anything outside its
 *     known set (``en``, ``gr``, ``bg``, ``hr``, ``si``).
 *
 * Only GR and CY are verified as live BoxNow markets for this store —
 * the previous ``bg``/``hr`` frame-src entries were unverified guesses
 * and are dropped. Add a country here only once its origin has been
 * confirmed live, the same way GR/CY were.
 */

// ---------------------------------------------------------------------------
// Country / origin mapping
// ---------------------------------------------------------------------------

export interface BoxNowWidgetCountryConfig {
  /** Widget host for this country, e.g. ``https://widget-v5.boxnow.gr``. */
  origin: string
  /** The ``countryCode`` query param value the widget expects (lowercase alpha-2-ish: ``gr``/``cy``). */
  param: string
}

/** ISO alpha-2 → widget config, for every BoxNow market this store supports. */
export const BOXNOW_WIDGET_COUNTRIES: Record<string, BoxNowWidgetCountryConfig> = {
  GR: {
    origin: 'https://widget-v5.boxnow.gr',
    param: 'gr',
  },
  CY: {
    origin: 'https://widget-v5.boxnow.cy',
    param: 'cy',
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
 * {@link BOXNOW_ALLOWED_ORIGINS} below (postMessage trust).
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

// ---------------------------------------------------------------------------
// postMessage trust + payload parsing
// ---------------------------------------------------------------------------

/**
 * Explicit allowlist of origins from which BoxNow widget postMessage
 * events are accepted. **Must stay in sync with the CSP ``frame-src``**
 * directive at ``server/middleware/3.csp.ts`` — both derive from
 * {@link BOXNOW_FRAME_ORIGINS} above.
 */
export const BOXNOW_ALLOWED_ORIGINS: readonly string[] = BOXNOW_FRAME_ORIGINS

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
   * ISO alpha-2 of the selected locker (``GR``/``CY``), from the
   * widget's ``boxnowCountry`` field. Absent when the widget sent no
   * country this store supports; the picker then rejects the locker,
   * because it cannot tell which country's network it belongs to.
   */
  boxnowLockerCountryCode?: string
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
  // ``boxnowCountry`` is the locker's ISO alpha-2 (``"GR"``/``"CY"``);
  // kept only when it names a country this store has a widget for.
  if (typeof d.boxnowCountry === 'string' && boxNowWidgetCountry(d.boxnowCountry)) {
    locker.boxnowLockerCountryCode = d.boxnowCountry.toUpperCase()
  }

  return locker
}

// ---------------------------------------------------------------------------
// Iframe URL builder
// ---------------------------------------------------------------------------

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

/**
 * Map a storefront i18n locale to the BoxNow widget's ``language``
 * query param. See the module docstring for the verified mapping
 * (``el`` aliases to the widget's Greek copy, ``en`` is already known —
 * both storefront locales pass straight through unchanged). Kept as an
 * explicit map (not an identity function) so a future storefront locale
 * outside this pair is a deliberate decision here rather than a silent
 * English fallback inside BoxNow's own script.
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
